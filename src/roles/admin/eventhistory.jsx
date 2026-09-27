import { useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import api from '../../api';
import { useFeedbackModal } from '../../components/shared/feedbackmodal';
import { canManageEvents, canUploadEventImages } from '../../permissions';
import {
  normalizeDateString,
  normalizeTimeString,
  phWallClockToMillis,
  toDisplayTime
} from '../../utils/philippinesTime';
import {
  ACCEPT_ATTRIBUTE,
  MAX_BATCH_FILES,
  MAX_EVENT_IMAGES,
  formatBytes,
  isAcceptedImage,
  isPreviewableImage,
  prepareImageForUpload
} from '../../utils/eventImages';

const getEventTitle = (event) => event.title || event.titleSelection || event.reservationName || event.category || 'Untitled Event';

const EventHistoryModal = ({ event, userId, role, userName, initialPanel, onClose }) => {
  const canViewAttendance = canManageEvents(role);
  const canUpload = canUploadEventImages(role);
  const { showFeedback, askConfirmation, FeedbackModal } = useFeedbackModal();

  const allowedPanels = [
    ...(canViewAttendance ? ['attendance'] : []),
    ...(canUpload ? ['upload'] : []),
    'gallery'
  ];
  const [panel, setPanel] = useState(() => {
    if (allowedPanels.includes(initialPanel)) return initialPanel;
    return canViewAttendance ? 'attendance' : (canUpload ? 'upload' : 'gallery');
  });
  const eventId = event._id || event.id;

  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [members, setMembers] = useState([]);

  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [thumbUrls, setThumbUrls] = useState({});
  const [previewImage, setPreviewImage] = useState(null);
  const objectUrlsRef = useRef({});
  const gridRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResults, setUploadResults] = useState([]);
  const fileInputRef = useRef(null);

  const memberMap = useMemo(
    () => new Map(members.map(member => [String(member._id), member])),
    [members]
  );

  const getMemberFor = (record) => memberMap.get(String(record?.userId)) || null;

  const getMemberRole = (record) => getMemberFor(record)?.role || '—';

  const getMemberMinistry = (record) => {
    const member = getMemberFor(record);
    if (!member) return '—';
    const list = Array.isArray(member.ministries) ? member.ministries.filter(Boolean) : [];
    if (list.length > 0) return list.join(', ');
    if (member.ministry && member.ministry !== 'None') return member.ministry;
    return '—';
  };

  const eventAttendees = useMemo(
    () => attendanceRecords
      .filter(record => String(record.eventId) === String(eventId))
      .sort((first, second) => phWallClockToMillis(first.date, first.time) - phWallClockToMillis(second.date, second.time)),
    [attendanceRecords, eventId]
  );

  const loadAttendance = async () => {
    setAttendanceLoading(true);
    try {
      const [attendanceRes, membersRes] = await Promise.all([
        api.getAttendance(),
        api.getMembers()
      ]);
      setAttendanceRecords(Array.isArray(attendanceRes.data) ? attendanceRes.data : []);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch (err) {
      console.error('Failed to load event attendance:', err);
      showFeedback('Unable to load the attendance list for this event.');
    } finally {
      setAttendanceLoading(false);
    }
  };

  const loadImages = async () => {
    setImagesLoading(true);
    try {
      const response = await api.getEventImages(eventId, userId);
      setImages(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error('Failed to load event images:', err);
      setImages([]);
    } finally {
      setImagesLoading(false);
    }
  };

  useEffect(() => {
    if (panel === 'attendance') loadAttendance();
    if (panel === 'gallery' || panel === 'upload') loadImages();
  }, [panel, eventId]);

  useEffect(() => () => {
    Object.values(objectUrlsRef.current).forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current = {};
  }, []);

  useEffect(() => {
    if (panel !== 'gallery' || images.length === 0 || typeof IntersectionObserver === 'undefined') return undefined;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const imageId = entry.target.dataset.imageId;
        const record = images.find(image => String(image.id) === String(imageId));
        if (record) loadThumb(record);
      });
    }, { rootMargin: '250px' });

    const grid = gridRef.current;
    if (!grid) return undefined;
    grid.querySelectorAll('[data-image-id]').forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [panel, images]);

  const loadThumb = async (record) => {
    if (!record || objectUrlsRef.current[record.id]) return;
    try {
      const response = await api.getEventImageFile(eventId, record.id, userId);
      const url = URL.createObjectURL(response.data);
      objectUrlsRef.current[record.id] = url;
      setThumbUrls(prev => ({ ...prev, [record.id]: url }));
    } catch (err) {
      console.error('Failed to load event image file:', err);
    }
  };

  const handleFilesSelected = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (selectedFiles.length === 0) return;

    const remainingSlots = Math.max(0, MAX_EVENT_IMAGES - images.length);
    const acceptedFiles = selectedFiles.filter(isAcceptedImage);
    const rejected = selectedFiles.length - acceptedFiles.length;
    const batch = acceptedFiles.slice(0, Math.min(MAX_BATCH_FILES, remainingSlots));

    if (rejected > 0) showFeedback(`${rejected} file(s) skipped: only JPEG, PNG, WEBP, GIF, AVIF, and HEIC photos are allowed.`);
    if (acceptedFiles.length > batch.length && batch.length === remainingSlots) {
      showFeedback(`Only ${remainingSlots} more photo slot(s) remain for this event.`);
    }
    if (batch.length === 0) return;

    setPanel('upload');
    uploadFiles(batch);
  };

  const uploadFiles = async (files) => {
    setUploading(true);
    setUploadResults([]);
    setUploadProgress(0);

    const results = [];
    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      try {
        const payload = await prepareImageForUpload(file);
        await api.uploadEventImage(eventId, payload, userId, role, userName);
        results.push({ name: file.name, status: 'Uploaded', ok: true, size: payload.size });
      } catch (err) {
        const message = err.response?.data?.error || err.message || 'Upload failed.';
        results.push({ name: file.name, status: message, ok: false });
      }
      setUploadResults([...results]);
      setUploadProgress(Math.round(((index + 1) / files.length) * 100));
    }

    setUploading(false);
    const failed = results.filter(result => !result.ok).length;
    if (failed === 0) {
      showFeedback(`${results.length} photo(s) uploaded to ${getEventTitle(event)}.`);
    } else {
      showFeedback(`${results.length - failed} photo(s) uploaded, ${failed} failed.`);
    }
    await loadImages();
  };

  const handleDeleteImage = (record) => {
    askConfirmation(`Remove ${record.fileName} from this event gallery?`, async () => {
      try {
        await api.deleteEventImage(eventId, record.id, userId, role);
        const staleUrl = objectUrlsRef.current[record.id];
        if (staleUrl) URL.revokeObjectURL(staleUrl);
        delete objectUrlsRef.current[record.id];
        setThumbUrls(prev => {
          const next = { ...prev };
          delete next[record.id];
          return next;
        });
        setImages(prev => prev.filter(image => String(image.id) !== String(record.id)));
        setPreviewImage(null);
        showFeedback('Photo removed from the event gallery.');
      } catch (err) {
        console.error('Failed to delete event image:', err);
        showFeedback('Unable to remove that photo.');
      }
    });
  };

  const exportAttendance = () => {
    if (eventAttendees.length === 0) return;
    const rows = eventAttendees.map(record => ({
      Time: toDisplayTime(record.time) || normalizeTimeString(record.time),
      Name: record.userName || record.userId,
      Role: getMemberRole(record),
      Ministry: getMemberMinistry(record),
      Date: normalizeDateString(record.date),
      'Time (GMT+8)': normalizeTimeString(record.time),
      Event: getEventTitle(event),
      Status: record.status || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows, {
      header: ['Time', 'Name', 'Role', 'Ministry', 'Date', 'Time (GMT+8)', 'Event', 'Status']
    });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Event Attendance');
    const fileStamp = `${normalizeDateString(event.date) || 'event'}_${Date.now()}`;
    XLSX.writeFile(workbook, `Event_Attendance_${fileStamp}.xlsx`);
  };

  const panelTabs = [
    ...(canViewAttendance ? [{ key: 'attendance', label: 'View Event Attendance' }] : []),
    ...(canUpload ? [{ key: 'upload', label: 'Upload Event Images' }] : []),
    { key: 'gallery', label: 'View Images' }
  ];

  return (
    <div style={styles.backdrop} onClick={onClose}>
      <div style={styles.modal} onClick={(clickEvent) => clickEvent.stopPropagation()}>
        <div style={styles.modalHeader}>
          <div>
            <h3 style={styles.modalTitle}>{getEventTitle(event)}</h3>
            <p style={styles.modalSubtitle}>
              {normalizeDateString(event.date) || 'Date TBA'} • {event.time || `${event.timeStart || ''} - ${event.timeEnd || ''}`.trim()} • {event.room || 'No location'} • {PH_TIME_LABEL}
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="Close event history">✕</button>
        </div>

        <div style={styles.tabRow}>
          {panelTabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setPanel(tab.key)}
              style={{ ...styles.tab, ...(panel === tab.key ? styles.tabActive : {}) }}
            >
              {tab.label}
              {tab.key === 'gallery' && images.length > 0 ? ` (${images.length})` : ''}
            </button>
          ))}
        </div>

        <div style={styles.modalBody}>
          {panel === 'attendance' && (
            <div>
              <div style={styles.panelHeader}>
                <p style={styles.panelHint}>
                  {attendanceLoading ? 'Loading check-in logs...' : `${eventAttendees.length} member(s) recorded for this event.`}
                </p>
                <button
                  type="button"
                  onClick={exportAttendance}
                  disabled={eventAttendees.length === 0}
                  style={{ ...styles.actionBtn, background: 'var(--color-primary)', color: '#ffffff', borderColor: 'transparent', opacity: eventAttendees.length === 0 ? 0.5 : 1 }}
                >
                  📥 Export Sheet
                </button>
              </div>

              {attendanceLoading ? (
                <p style={styles.mutedText}>Reading attendance files...</p>
              ) : eventAttendees.length === 0 ? (
                <p style={styles.mutedText}>No QR check-ins were recorded for this event.</p>
              ) : (
                <div style={styles.tableWrapper}>
                  <div style={styles.tableHeader}>
                    <span>Time</span>
                    <span>Name</span>
                    <span>Role</span>
                    <span>Ministry</span>
                  </div>
                  {eventAttendees.map((record, index) => (
                    <div key={`${record._id || record.userId}-${index}`} style={styles.tableRow}>
                      <span style={styles.cellTime}>{toDisplayTime(record.time) || record.time || '--'}</span>
                      <span>{record.userName || record.userId}</span>
                      <span>{getMemberRole(record)}</span>
                      <span>{getMemberMinistry(record)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {panel === 'upload' && (
            <div>
              <div style={styles.panelHeader}>
                <p style={styles.panelHint}>
                  Upload up to {MAX_BATCH_FILES} photos per batch ({images.length}/{MAX_EVENT_IMAGES} stored). Standard camera formats supported.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || images.length >= MAX_EVENT_IMAGES}
                  style={{ ...styles.actionBtn, background: 'var(--color-primary)', color: '#ffffff', borderColor: 'transparent', opacity: uploading || images.length >= MAX_EVENT_IMAGES ? 0.5 : 1 }}
                >
                  📷 Select Photos
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_ATTRIBUTE}
                multiple
                onChange={handleFilesSelected}
                style={{ display: 'none' }}
              />

              {uploading && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={styles.progressTrack}>
                    <div style={{ ...styles.progressFill, width: `${uploadProgress}%` }} />
                  </div>
                  <p style={{ ...styles.mutedText, marginTop: '6px' }}>Uploading... {uploadProgress}%</p>
                </div>
              )}

              {uploadResults.length > 0 && (
                <div style={styles.uploadLog}>
                  {uploadResults.map((result, index) => (
                    <div key={`${result.name}-${index}`} style={styles.uploadLogRow}>
                      <span style={result.ok ? styles.uploadOk : styles.uploadFail}>{result.ok ? '✓' : '✕'}</span>
                      <span style={{ flex: 1 }}>{result.name}</span>
                      <span style={styles.mutedText}>{result.ok ? formatBytes(result.size) : result.status}</span>
                    </div>
                  ))}
                </div>
              )}

              {!uploading && uploadResults.length === 0 && (
                <p style={styles.mutedText}>Select photos from your device or camera roll to add them to this event.</p>
              )}
            </div>
          )}

          {panel === 'gallery' && (
            <div ref={gridRef}>
              {imagesLoading ? (
                <p style={styles.mutedText}>Loading event photos...</p>
              ) : images.length === 0 ? (
                <p style={styles.mutedText}>No photos have been uploaded for this event yet.</p>
              ) : (
                <div style={styles.galleryGrid}>
                  {images.map((image) => {
                    const previewable = isPreviewableImage(image.contentType);
                    const source = thumbUrls[image.id];
                    return (
                      <div key={image.id} data-image-id={image.id} style={styles.galleryItem}>
                        {previewable && source ? (
                          <img
                            src={source}
                            alt={image.fileName}
                            style={styles.galleryImage}
                            onClick={() => setPreviewImage({ ...image, url: source })}
                          />
                        ) : (
                          <div style={styles.galleryPlaceholder}>
                            <span style={{ fontSize: '28px' }}>🖼️</span>
                            <span style={styles.mutedText}>{previewable ? 'Loading...' : 'HEIC photo'}</span>
                          </div>
                        )}
                        <div style={styles.galleryMeta}>
                          <span style={styles.galleryName} title={image.fileName}>{image.fileName}</span>
                          <span style={styles.mutedText}>{formatBytes(image.size)}</span>
                        </div>
                        <div style={styles.galleryActions}>
                          {source && (
                            <a href={source} download={image.fileName} style={styles.galleryLink}>Download</a>
                          )}
                          {canUpload && (
                            <button type="button" onClick={() => handleDeleteImage(image)} style={styles.galleryDelete}>Remove</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {previewImage && (
        <div style={styles.lightbox} onClick={() => setPreviewImage(null)}>
          <img src={previewImage.url} alt={previewImage.fileName} style={styles.lightboxImage} />
          <p style={styles.lightboxCaption}>{previewImage.fileName} • uploaded by {previewImage.uploadedByName || 'administration'}</p>
          <button type="button" onClick={() => setPreviewImage(null)} style={styles.closeBtn}>Close</button>
        </div>
      )}

      <FeedbackModal />
    </div>
  );
};

const PH_TIME_LABEL = 'Philippine Standard Time (GMT+8)';

const styles = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', zIndex: 1200 },
  modal: { background: '#ffffff', borderRadius: '20px', width: 'min(920px, 100%)', maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 48px rgba(15,23,42,0.25)', overflow: 'hidden' },
  modalHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', padding: '20px 24px', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { margin: 0, fontSize: '18px', fontWeight: '700', color: '#0f172a' },
  modalSubtitle: { margin: '4px 0 0', fontSize: '12px', color: '#64748b' },
  closeBtn: { background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#0f172a' },
  tabRow: { display: 'flex', gap: '8px', padding: '14px 24px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap' },
  tab: { border: '1px solid #cbd5e1', background: '#f8fafc', color: '#334155', padding: '9px 14px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' },
  tabActive: { background: 'var(--color-primary)', color: '#ffffff', borderColor: 'transparent' },
  modalBody: { padding: '20px 24px 24px', overflowY: 'auto' },
  panelHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '14px', flexWrap: 'wrap' },
  panelHint: { margin: 0, fontSize: '13px', color: '#475569' },
  actionBtn: { padding: '9px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '13px', fontWeight: '600', cursor: 'pointer', background: '#ffffff' },
  mutedText: { fontSize: '12px', color: '#94a3b8', margin: '4px 0' },
  tableWrapper: { display: 'grid', gap: '8px' },
  tableHeader: { display: 'grid', gridTemplateColumns: '110px 1.4fr 1fr 1.2fr', gap: '10px', padding: '10px 12px', background: '#f1f5f9', borderRadius: '12px', fontSize: '11px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' },
  tableRow: { display: 'grid', gridTemplateColumns: '110px 1.4fr 1fr 1.2fr', gap: '10px', padding: '10px 12px', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#ffffff', fontSize: '13px', color: '#334155' },
  cellTime: { fontWeight: '600' },
  progressTrack: { height: '10px', background: '#e2e8f0', borderRadius: '999px', overflow: 'hidden' },
  progressFill: { height: '100%', background: 'var(--color-primary)', transition: 'width 0.2s ease' },
  uploadLog: { display: 'grid', gap: '6px', maxHeight: '260px', overflowY: 'auto' },
  uploadLogRow: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: '12px', color: '#334155' },
  uploadOk: { color: '#16a34a', fontWeight: '700' },
  uploadFail: { color: '#dc2626', fontWeight: '700' },
  galleryGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '14px' },
  galleryItem: { border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden', background: '#ffffff', display: 'flex', flexDirection: 'column' },
  galleryImage: { width: '100%', height: '140px', objectFit: 'cover', cursor: 'pointer', background: '#f1f5f9' },
  galleryPlaceholder: { height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '6px', background: '#f1f5f9' },
  galleryMeta: { display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '8px 10px', borderTop: '1px solid #f1f5f9' },
  galleryName: { fontSize: '12px', color: '#334155', fontWeight: '600', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  galleryActions: { display: 'flex', gap: '8px', padding: '0 10px 10px', flexWrap: 'wrap' },
  galleryLink: { fontSize: '12px', fontWeight: '600', color: '#2563eb', textDecoration: 'none' },
  galleryDelete: { fontSize: '12px', fontWeight: '600', color: '#dc2626', background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '4px 10px', cursor: 'pointer' },
  lightbox: { position: 'fixed', inset: 0, background: 'rgba(2,6,23,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', padding: '24px', zIndex: 1300 },
  lightboxImage: { maxWidth: '92vw', maxHeight: '78vh', objectFit: 'contain', borderRadius: '12px' },
  lightboxCaption: { margin: 0, color: '#e2e8f0', fontSize: '13px' }
};

export default EventHistoryModal;
