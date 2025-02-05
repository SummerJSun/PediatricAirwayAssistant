import React, { useState } from 'react';

const ParticipantIDPopup = ({ onSubmit, onClose }) => {
  const [participantID, setParticipantID] = useState('');
  const [error, setError] = useState('');  // Add state for handling errors

// simple validation to ensure the participantID isn't empty
// participantID is mandatory to continue with the conversation
const handleSubmit = () => {
  if (participantID.trim()) { 
    fetch(`${process.env.REACT_APP_BACKEND_URL}/set-participant-id`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ participantID: participantID })
    })
    .then(response => response.json())
    .then(data => {
      console.log(data.message); // Handle success
      onSubmit(participantID);  // Continue with whatever processing you need
    })
    .catch(error => {
      console.error('Error:', error);
    });
  } else {
    setError("Participant ID cannot be empty.");
  }
};


  return (
    <div className="popup-overlay">
      <div className="popup">
        <span className="close" onClick={onClose}>&times;</span>
        <div className="popup-content">
          <h2>Enter Participant ID</h2>
          <input
            type="text"
            value={participantID}
            onChange={(e) => setParticipantID(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') handleSubmit(); // Allow submitting with Enter key
            }}
          />
          <button onClick={handleSubmit}>Submit</button>
        </div>
      </div>
    </div>
  );
};

export default ParticipantIDPopup;