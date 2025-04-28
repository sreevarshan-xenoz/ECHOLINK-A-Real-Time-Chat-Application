import { Client } from "@gradio/client";

// Flag to track if we're in fallback mode due to API issues
let isInFallbackMode = false;

// Simple responses for fallback mode
const fallbackResponses = [
  "I'm Echo AI, your friendly assistant. How can I help you today?",
  "I'm currently operating in offline mode due to connection issues. I'll do my best to assist you!",
  "That's an interesting question! I'd normally connect to my knowledge base, but I'm in offline mode right now.",
  "I wish I could give you a more detailed answer, but I'm currently in fallback mode. Try again later when connection is restored.",
  "I understand your question, but I'm limited in my responses while in offline mode.",
  "Thanks for chatting with me! I'm currently in a simplified mode, but I'll try to be helpful.",
  "I'm Echo AI, currently in a limited functionality mode. Please be patient as we work to restore full service."
];

// Get a random fallback response
const getFallbackResponse = () => {
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};

export async function connectToQwen() {
  if (isInFallbackMode) {
    throw new Error("Currently in fallback mode due to connection issues");
  }
  
  try {
    const hfToken = process.env.REACT_APP_HF_TOKEN;
    
    if (!hfToken) {
      console.warn("No Hugging Face token found. Using fallback mode.");
      isInFallbackMode = true;
      throw new Error("No Hugging Face token configured");
    }
    
    const client = await Client.connect("Qwen/QwQ-32B-Demo", {
      hf_token: hfToken,
    });
    return client;
  } catch (error) {
    console.error("Error connecting to Echo AI model:", error);
    isInFallbackMode = true;
    throw error;
  }
}

// Helper function to extract the actual message from the Echo AI response
function extractMessageFromQwenResponse(response) {
  if (!response || typeof response !== 'object') {
    return "Couldn't process the response";
  }

  // Handle array responses (most common format)
  if (Array.isArray(response)) {
    // Look for the last items update that contains messages
    for (let i = response.length - 1; i >= 0; i--) {
      const update = response[i];
      if (update && update.__type__ === "update" && Array.isArray(update.items)) {
        // Find the assistant message in the items
        const assistantMessage = update.items.find(item => item.role === "assistant");
        if (assistantMessage && assistantMessage.content) {
          // Replace any mention of "Qwen" with "Echo AI" in the response
          let content = assistantMessage.content;
          content = content.replace(/\bQwen\b/g, "Echo AI");
          content = content.replace(/\bqwen\b/gi, "Echo AI");
          return content;
        }
      }
    }
  }

  // If we can't find the structured format, try to use toString or stringify
  try {
    let textResponse = typeof response.toString === 'function' ? 
      response.toString() : 
      JSON.stringify(response);
    
    // Replace any mention of "Qwen" with "Echo AI" in the response
    textResponse = textResponse.replace(/\bQwen\b/g, "Echo AI");
    textResponse = textResponse.replace(/\bqwen\b/gi, "Echo AI");
    return textResponse;
  } catch (e) {
    return "Received a response I cannot display";
  }
}

export async function submitMessage(message) {
  if (isInFallbackMode) {
    // In fallback mode, just return a simple response
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    return getFallbackResponse();
  }
  
  try {
    const client = await connectToQwen();
    const result = await client.predict("/submit", {
      sender_value: message,
    });
    return extractMessageFromQwenResponse(result.data);
  } catch (error) {
    console.error("Error submitting message:", error);
    isInFallbackMode = true;
    return "I'm having trouble connecting to my knowledge base. I'll operate in a simplified mode for now.";
  }
}

export async function newChat() {
  if (isInFallbackMode) {
    return { success: true, fallback: true };
  }
  
  try {
    const client = await connectToQwen();
    const result = await client.predict("/new_chat", {});
    return result.data;
  } catch (error) {
    console.error("Error creating new chat:", error);
    isInFallbackMode = true;
    return { success: false, fallback: true };
  }
}

export async function regenerateMessage() {
  if (isInFallbackMode) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay
    return getFallbackResponse();
  }
  
  try {
    const client = await connectToQwen();
    const result = await client.predict("/regenerate_message", {});
    return extractMessageFromQwenResponse(result.data);
  } catch (error) {
    console.error("Error regenerating message:", error);
    return "I'm unable to regenerate a response at the moment. Let's continue our conversation.";
  }
}

export async function cancelGeneration() {
  if (isInFallbackMode) {
    return { success: true, fallback: true };
  }
  
  try {
    const client = await connectToQwen();
    const result = await client.predict("/cancel", {});
    return result.data;
  } catch (error) {
    console.error("Error canceling generation:", error);
    return { success: false };
  }
}

export async function clearHistory() {
  if (isInFallbackMode) {
    isInFallbackMode = false; // Try to reconnect after clearing
    return { success: true };
  }
  
  try {
    const client = await connectToQwen();
    const result = await client.predict("/clear_conversation_history", {});
    return result.data;
  } catch (error) {
    console.error("Error clearing history:", error);
    return { success: false };
  }
}

// Function to check connection status and exit fallback mode if possible
export async function checkConnection() {
  if (!isInFallbackMode) return true;
  
  try {
    await connectToQwen();
    isInFallbackMode = false;
    return true;
  } catch (error) {
    console.log("Still in fallback mode, connection check failed:", error);
    return false;
  }
} 