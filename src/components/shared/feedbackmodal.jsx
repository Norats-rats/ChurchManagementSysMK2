import { useState } from 'react';

export const useFeedbackModal = () => {
  const [feedback, setFeedback] = useState(null);
  const [confirmation, setConfirmation] = useState(null);

  const showFeedback = (message, afterOkay) => setFeedback({ message, afterOkay });
  const askConfirmation = (message, action) => setConfirmation({ message, action });

  const FeedbackModal = () => (
    <>
      {confirmation && (
        <div className="feedback-modal-overlay" role="presentation">
          <div className="feedback-modal" role="dialog" aria-modal="true" aria-label="Confirm action">
            <p>{confirmation.message}</p>
            <div className="feedback-modal-actions">
              <button type="button" className="feedback-button secondary" onClick={() => setConfirmation(null)}>No</button>
              <button type="button" className="feedback-button primary" onClick={async () => { const action = confirmation.action; setConfirmation(null); await action(); }}>Yes</button>
            </div>
          </div>
        </div>
      )}
      {feedback && (
        <div className="feedback-modal-overlay" role="presentation">
          <div className="feedback-modal" role="dialog" aria-modal="true" aria-label="Action result">
            <p>{feedback.message}</p>
            <button type="button" className="feedback-button primary feedback-okay" onClick={() => { const afterOkay = feedback.afterOkay; setFeedback(null); afterOkay?.(); }}>Okay</button>
          </div>
        </div>
      )}
    </>
  );

  return { showFeedback, askConfirmation, FeedbackModal };
};
