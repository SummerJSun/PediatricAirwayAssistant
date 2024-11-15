import React, { useState, useEffect, useRef  } from 'react';
import { TypeAnimation } from 'react-type-animation';
import './ChatbotUi.css';

export default function ChatbotUi({isUserAdmin}){

    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Loading for text generation
    const [loading, setLoading] = useState(false); //Loading for initalization
    const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);
    const [participantID, setParticipantID] = useState('');
    const [ready, setReady] = useState(false);
    const [image, setImage] = useState(null);
    const [isThinking, setIsThinking] = useState(false);

    const deleteLastMessage = () => {
        setMessages(prevMessages => {
            if (prevMessages.length === 0) {
                return prevMessages; // If no messages, return as is
            }
            return prevMessages.slice(0, -1); // Remove the last message
        });
    };

    const formatMessage = (text) => {
        // Replace /n with <br> for new lines
        let formattedText = text.replace(/\n/g, '<br>');
        formattedText = formattedText.replace(/\\n/g, '<br>');
    
        // Replace ***text*** with <b>text</b> for bold
        formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
    
        return formattedText;
    };

    const handleResetConversation = () => {
        // Call backend to reset the conversation
        fetch(`${process.env.REACT_APP_BACKEND_URL}/reset-conversation`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ participantID: participantID })
        }).then(response => {
            if (response.ok) {
                console.log('Conversation reset successfully');
                setMessages([]); // Clear the messages array in frontend
                setUserInput(""); // Clear the input field if needed
                initializeChat(); // Initialize the conversation after reset
            } else {
                console.error('Failed to reset the conversation');
            }
        })
        .catch(error => console.error('Error resetting the conversation:', error));
    };

    const handleUserInput = (e) => {
        setUserInput(e.target.value);
    };
    
    const handleParticipantIDReset = () => {
        const wantNewID = window.confirm("Do you want to enter a new participant ID?");
        if (wantNewID) {
            const newID = window.prompt("Please enter the new participant ID:");
            if (newID) {
                setParticipantID(newID);
                // Send the new participant ID to the backend
                fetch(`${process.env.REACT_APP_BACKEND_URL}/set-participant-id`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ participantID: newID })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Participant ID set:', data);
                    handleResetConversation();
                })
                .catch(error => console.error('Error setting participant ID:', error));
            }
        } else {
            handleResetConversation();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (userInput.trim() === "") return;

        setIsThinking(true);

        const userMessage = { id: Date.now(), text: userInput, sender: 'user', type: 'text' };
        setMessages((prevMessages) => [...prevMessages, userMessage]);
        setUserInput(''); 

        try {
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/submit-user-input`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: userInput })
            });

            if (!response.ok) throw new Error("Failed to submit user input");

            const data = await response.json();
            if (data.image) {
                setImage(data.image);
                console.log("Image found in response");
            } else {
                console.log(data.message);
            }

            if (data.streamReady) setReady(true);
        } catch (error) {
            console.error("Error submitting input or starting stream:", error);
        }finally {
            setIsThinking(false); // Hide "Thinking..." after response is received
        }
    };

    useEffect(() => {
        if (!ready) return; 

        const eventSource = new EventSource(`${process.env.REACT_APP_BACKEND_URL}/stream-chat`);

        eventSource.onmessage = (event) => {
            setMessages((prevMessages) => {
                const lastMessageIndex = prevMessages.length - 1;

                if (prevMessages[lastMessageIndex]?.sender === 'bot' && prevMessages[lastMessageIndex]?.isStreamed) {
                    const updatedMessages = [...prevMessages];
                    const formatText = formatMessage(event.data);
                    updatedMessages[lastMessageIndex].text += formatText;
                    return updatedMessages;
                } else {
                    const botMessage = { id: Date.now(), text: event.data, sender: 'bot', isStreamed: true, type: 'text' };
                    return [...prevMessages, botMessage];
                }
            });
        };

        eventSource.addEventListener('stream_close', () => {
            setMessages((prevMessages) => {
                const lastMessageIndex = prevMessages.length - 1;

                if (prevMessages[lastMessageIndex]?.sender === 'bot') {
                    const updatedMessages = [...prevMessages];
                    updatedMessages[lastMessageIndex].isStreamed = false;

                    if (image) {
                        const imgMessage = { id: Date.now(), text: image, sender: 'bot', type: 'image', style: { width: '50%' } };
                        updatedMessages.push(imgMessage);
                    }
                    return updatedMessages;
                }
                return prevMessages;
            });
            eventSource.close();
            setReady(false); 
        });

        eventSource.onerror = (error) => {
            console.error('Error with streaming:', error);
            eventSource.close();
            setReady(false); 
        };

        return () => eventSource.close(); 
    }, [ready]);


  
//   const processMessage = ( messageText ) => {
//         // Format the message text with newlines and bold
//         messageText = formatMessage(messageText);
//         console.log(messageText)
//         const botMessage = { id: Date.now(), text: messageText, sender: 'bot', type: 'text' };

//         const match = messageText.toLowerCase().match(/related image found, image id is (\d+)/);
//         const instruction_match = messageText.toLowerCase().match(/instruction image found, image id is (\d+)/);
//         const knowledge_match = messageText.toLowerCase().match(/external knowledge detected, the term is (.*)/);
//         if (match) {
//             console.log("User image search requested")
//             const imageId = match[1]; // Extract the ID from the message
//             fetchImage(imageId); // Call fetchImage with the extracted ID
//         } else if (instruction_match) {
//             console.log("Bot instruction image search requested")
//             // setMessages(prevMessages => [...prevMessages, botMessage]);
//             const imageId = instruction_match[1];
//             fetchImage(imageId);
//         }  

//         if (knowledge_match) {
//             console.log("knowledge base query requested, matched knowledge", knowledge_match[1])
//             const overview = knowledge_match[1];
//             deleteLastMessage();
//             fetchKnowledge(overview);
//         }else {
//             console.log("Normal Response")
//             // If no specific pattern is detected, just add the message as usual
//         }
        
//     };

  
  const initializeChat = () => {
    setLoading(true);
    fetch(`${process.env.REACT_APP_BACKEND_URL}/init-conversation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log("Chat initialized:", data);
    })
    .then(
        setTimeout(() => {
            setLoading(false);
        }, 5000))
    .then(data => {
        const botMessage = { id: Date.now(), text: 'Please type "Begin Simulation" to begin', sender: 'bot', type: 'text' };
        setMessages(prevMessages => [...prevMessages, botMessage]);
    })
    .catch(error => {
        console.error('Error initializing chat:', error);
    });
};

    

    const submitChatHistory = (history) => {
        fetch(`${process.env.REACT_APP_BACKEND_URL}/submit-chat-history`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: history
        })
        .then(response => response.json())
        .then(data => {
            console.log('Chat history auto-saved successfully:', data);
        })
        .catch(error => console.error('Error auto-saving chat history:', error));
    };
  
    const chatWindowRef = useRef(null);
    useEffect(() => {
      const chatWindow = chatWindowRef.current;
      chatWindow.scrollTop = chatWindow.scrollHeight;
      sessionStorage.setItem('abc', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {

        console.log(savedMessages)
        if (savedMessages) {
            console.log('Not first visit')
            setMessages(JSON.parse(savedMessages));
        }else{
            console.log('first visit')
            handleResetConversation();
        }
    }, []);
    const savedMessages = sessionStorage.getItem('abc')

    useEffect(() => {
        // Auto-save chat history whenever messages change
        const autoSaveChatHistory = () => {
            const history = JSON.stringify(messages);
            sessionStorage.setItem('abc', history);
            
            // Debounce the API call to avoid too frequent requests
            clearTimeout(autoSaveTimeout);
            setAutoSaveTimeout(setTimeout(() => {
                submitChatHistory(history);
            }, 100)); 
        };

        autoSaveChatHistory();

        return () => clearTimeout(autoSaveTimeout);
    }, [messages]);

    // Keep the manual save button
    const handleManualSave = () => {
        const history = sessionStorage.getItem('abc');
        if (history) {
            submitChatHistory(history);
            alert('Chat history saved successfully!');
        }
    };


    return (
        <div className="chatbot-ui">
            <div className="chat-window" ref={chatWindowRef}>
                {messages.map((msg) => (
                    <div key={msg.id} className={`message ${msg.sender}`}>
                        {msg.type === 'text' ? (
                            <div className="formatted-text" dangerouslySetInnerHTML={{ __html: msg.text }} />
                        ) : (
                            <img src={msg.text} alt="Chatbot response" className="chat-image" />
                        )}
                    </div>
                ))}
                {isThinking && (
                    <div className="thinking-text">Thinking...</div>
                )}
            </div>
            <form className="chat-bot-form" onSubmit={handleSubmit}>
                {loading ? (
                    <div className="loading-bar">Chatbot Initializing...</div>
                ) : (
                    <>
                        {isUserAdmin && <button type="button" className="reset-button" onClick={handleResetConversation}>Reset</button>}
                        <button type="button" className="reset-button" onClick={handleParticipantIDReset}>ParticipantID Reset</button>
                        <input type="text" className="user-input" value={userInput} onChange={(e) => setUserInput(e.target.value)} placeholder="Say something..." />
                        <button type="submit">Send</button>
                        <button type="button" className="save-conversation-button" onClick={handleManualSave}>Save</button>
                    </>
                )}
            </form>
        </div>
    );
}