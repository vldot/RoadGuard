// Local LLM Service for GPT4All Llama 3.2 1B Instruct
export interface DiagnosisResult {
  category: string;
  confidence: number;
  suggestedService: string;
  description: string;
  urgency: 'low' | 'medium' | 'high';
  reasoning: string;
}

export interface ConversationMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

class LocalLLMService {
  private baseURL: string;
  private isServerAvailable: boolean;
  
  constructor() {
    // GPT4All default server endpoint when running locally
    this.baseURL = 'http://localhost:4891/v1';
    this.isServerAvailable = false;
    this.checkServerStatus();
  }

  private async checkServerStatus(): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/models`, { 
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      this.isServerAvailable = response.ok;
    } catch (error) {
      console.log('GPT4All server not available, using fallback logic');
      this.isServerAvailable = false;
    }
  }

  private getSystemPrompt(vehicleType: string): string {
    return `You are a helpful car diagnostic assistant for ${vehicleType} problems.

Ask ONE question at a time. Keep responses short and simple. After 3-4 questions, give a diagnosis.

For diagnosis, format your response exactly like this:
DIAGNOSIS: [Category] | [Confidence 65-90] | [Service] | [urgency] | [reason]

Example: "DIAGNOSIS: Engine Starting | 85 | Battery Service | high | clicking sounds indicate starter issues"

Start by asking what problem they're having.`;
  }

  async sendMessage(
    conversationHistory: ConversationMessage[],
    vehicleType: string,
    userMessage: string
  ): Promise<{
    message: string;
    diagnosis?: DiagnosisResult;
  }> {
    // Always check server availability first
    await this.checkServerStatus();
    
    if (this.isServerAvailable) {
      try {
        return await this.queryLocalLLM(conversationHistory, vehicleType, userMessage);
      } catch (error) {
        console.error('LLM query failed, falling back:', error);
        this.isServerAvailable = false;
      }
    }
    
    // Fallback to smart rule-based responses
    return this.getSmartFallbackResponse(conversationHistory, userMessage, vehicleType);
  }

  private async queryLocalLLM(
    history: ConversationMessage[],
    vehicleType: string, 
    userMessage: string
  ): Promise<{ message: string; diagnosis?: DiagnosisResult }> {
    
    const messages = [
      { role: 'system' as const, content: this.getSystemPrompt(vehicleType) },
      ...history,
      { role: 'user' as const, content: userMessage }
    ];

    const response = await fetch(`${this.baseURL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'Llama-3.2-1B-Instruct', // Specific model name for 1B version
        messages: messages,
        temperature: 0.7,
        max_tokens: 150,
        stream: false
      }),
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!response.ok) {
      throw new Error(`Server responded with status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();

    // Parse diagnosis if present
    if (content.includes('DIAGNOSIS:')) {
      const parts = content.split('DIAGNOSIS:');
      const diagnosisText = parts[1].trim();
      const diagnosisParts = diagnosisText.split('|').map((p: string) => p.trim());
      
      if (diagnosisParts.length >= 5) {
        const [category, confidence, service, urgency, reasoning] = diagnosisParts;
        
        return {
          message: parts[0].trim() || "Based on our conversation, here's my diagnosis:",
          diagnosis: {
            category,
            confidence: Math.max(65, Math.min(90, parseInt(confidence) || 75)),
            suggestedService: service,
            urgency: urgency as 'low' | 'medium' | 'high',
            description: `Your ${vehicleType.toLowerCase()} appears to have ${category.toLowerCase()} issues. ${reasoning}`,
            reasoning
          }
        };
      }
    }

    return { message: content };
  }

  private getSmartFallbackResponse(
    history: ConversationMessage[],
    userMessage: string,
    vehicleType: string
  ): { message: string; diagnosis?: DiagnosisResult } {
    
    const userQuestionCount = history.filter(m => m.role === 'user').length;
    
    // Progressive questioning strategy
    if (userQuestionCount === 0) {
      return {
        message: `Hi! I'm here to help diagnose your ${vehicleType.toLowerCase()} problem. What's the main issue - won't start, strange noises, performance problems, or something else?`
      };
    }
    
    if (userQuestionCount === 1) {
      const symptoms = userMessage.toLowerCase();
      if (symptoms.includes('start')) {
        return {
          message: "When you turn the key, what happens? Do you hear clicking sounds, nothing at all, or does the engine turn over but not start?"
        };
      } else if (symptoms.includes('noise') || symptoms.includes('sound')) {
        return {
          message: "Can you describe the noise? Is it squealing, grinding, knocking, or rattling? When does it happen - when driving, braking, or starting?"
        };
      } else {
        return {
          message: "When did this problem start? Does it happen every time you drive, or only sometimes?"
        };
      }
    }
    
    if (userQuestionCount === 2) {
      return {
        message: "Are there any warning lights on your dashboard? Have you noticed any smells or changes in how the vehicle feels when driving?"
      };
    }
    
    // Time for diagnosis after 3+ questions
    const allUserInput = [
      userMessage,
      ...history.filter(m => m.role === 'user').map(m => m.content)
    ].join(' ').toLowerCase();
    
    const diagnosis = this.analyzeSymptoms(allUserInput, vehicleType);
    
    return {
      message: `Based on our conversation, here's my diagnosis:\n\n**${diagnosis.category}**\n${diagnosis.description}`,
      diagnosis
    };
  }

  private analyzeSymptoms(symptoms: string, vehicleType: string): DiagnosisResult {
    // Enhanced pattern matching for better accuracy
    const diagnosticPatterns = [
      {
        keywords: ['won\'t start', 'not start', 'no start', 'dead', 'click', 'clicking', 'battery'],
        category: 'Starting System Issues',
        service: 'Battery & Electrical Diagnostics', 
        urgency: 'high' as const,
        confidence: 80,
        reasoning: 'Starting problems often indicate battery, starter, or electrical issues'
      },
      {
        keywords: ['brake', 'brakes', 'squeaking', 'grinding', 'pedal', 'stopping'],
        category: 'Brake System Problems',
        service: 'Brake Service & Safety Check',
        urgency: 'high' as const, 
        confidence: 85,
        reasoning: 'Brake issues are safety-critical and need immediate attention'
      },
      {
        keywords: ['overheating', 'overheat', 'hot', 'steam', 'coolant', 'temperature'],
        category: 'Engine Cooling Problems', 
        service: 'Cooling System Service',
        urgency: 'high' as const,
        confidence: 90,
        reasoning: 'Overheating can cause expensive engine damage if not addressed quickly'
      },
      {
        keywords: ['ac', 'air conditioning', 'cold', 'hot air', 'climate control'],
        category: 'AC System Issues',
        service: 'Air Conditioning Service',
        urgency: 'medium' as const,
        confidence: 85,
        reasoning: 'AC problems affect comfort but aren\'t usually safety-critical'
      },
      {
        keywords: ['transmission', 'shifting', 'gear', 'clutch', 'slip', 'automatic'],
        category: 'Transmission Problems',
        service: 'Transmission Service',
        urgency: 'high' as const,
        confidence: 75,
        reasoning: 'Transmission issues can leave you stranded and are costly to repair'
      },
      {
        keywords: ['tire', 'tyre', 'flat', 'puncture', 'pressure', 'wheel'],
        category: 'Tire Problems',
        service: 'Tire Service & Repair',
        urgency: 'medium' as const,
        confidence: 90,
        reasoning: 'Tire issues can affect safety and fuel efficiency'
      },
      {
        keywords: ['oil', 'leak', 'maintenance', 'service due'],
        category: 'Maintenance Required',
        service: 'Oil Service & Maintenance',
        urgency: 'low' as const,
        confidence: 75,
        reasoning: 'Regular maintenance prevents bigger problems down the road'
      }
    ];

    let bestMatch = diagnosticPatterns[diagnosticPatterns.length - 1]; // Default
    let highestScore = 0;

    diagnosticPatterns.forEach(pattern => {
      const score = pattern.keywords.reduce((total, keyword) => {
        return total + (symptoms.includes(keyword) ? 1 : 0);
      }, 0);
      
      if (score > highestScore) {
        highestScore = score;
        bestMatch = pattern;
      }
    });

    // Adjust confidence based on keyword matches
    const adjustedConfidence = Math.min(90, bestMatch.confidence + (highestScore * 2));

    return {
      category: bestMatch.category,
      confidence: adjustedConfidence,
      suggestedService: bestMatch.service,
      urgency: bestMatch.urgency,
      description: `Your ${vehicleType.toLowerCase()} appears to have ${bestMatch.category.toLowerCase()}. ${bestMatch.reasoning}`,
      reasoning: bestMatch.reasoning
    };
  }

  // Public method to check if local LLM is available
  async isLocalLLMAvailable(): Promise<boolean> {
    await this.checkServerStatus();
    return this.isServerAvailable;
  }
}

export const localLLMService = new LocalLLMService();
export default localLLMService;