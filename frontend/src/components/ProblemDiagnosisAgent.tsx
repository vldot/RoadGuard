import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User as UserIcon,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Cpu
} from 'lucide-react';
import localLLMService, { DiagnosisResult, ConversationMessage } from '../services/localLLMService';

interface ChatMessage {
  id: string;
  sender: 'user' | 'agent';
  message: string;
  timestamp: Date;
  type?: 'question' | 'suggestion' | 'diagnosis' | 'normal';
}

// DiagnosisResult is now imported from the service

interface ProblemDiagnosisAgentProps {
  isOpen: boolean;
  onClose: () => void;
  onDiagnosisComplete: (diagnosis: DiagnosisResult) => void;
  vehicleType?: string;
}

// Old static data removed - now using dynamic LLM responses

const ProblemDiagnosisAgent: React.FC<ProblemDiagnosisAgentProps> = ({
  isOpen,
  onClose,
  onDiagnosisComplete,
  vehicleType = 'Car'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'agent',
      message: `Hello! I'm your AI diagnostic assistant powered by Llama 3.2. I'll help identify your ${vehicleType.toLowerCase()} problem. What issue are you experiencing?`,
      timestamp: new Date(),
      type: 'question'
    }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [isLLMAvailable, setIsLLMAvailable] = useState<boolean | null>(null);
  const [lastDiagnosis, setLastDiagnosis] = useState<DiagnosisResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    // Check if local LLM is available on mount
    const checkLLM = async () => {
      const available = await localLLMService.isLocalLLMAvailable();
      setIsLLMAvailable(available);
    };
    checkLLM();
  }, []);

  // Old analyze function removed - now handled by LLM service

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: newMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Add to conversation history
    const updatedHistory = [...conversationHistory, { role: 'user' as const, content: newMessage.trim() }];
    setConversationHistory(updatedHistory);
    
    setNewMessage('');
    setIsTyping(true);

    try {
      // Use local LLM service
      const response = await localLLMService.sendMessage(
        conversationHistory,
        vehicleType,
        newMessage.trim()
      );

      setIsTyping(false);

      if (response.diagnosis) {
        // Store the actual diagnosis object
        setLastDiagnosis(response.diagnosis);
        
        // Show diagnosis
        const diagnosisMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          message: response.message || `Based on our conversation, here's my diagnosis:\n\n**${response.diagnosis.category}**\n${response.diagnosis.description}\n\nConfidence: ${response.diagnosis.confidence}%\nUrgency: ${response.diagnosis.urgency.toUpperCase()}\n\nRecommended Service: ${response.diagnosis.suggestedService}`,
          timestamp: new Date(),
          type: 'diagnosis'
        };

        setMessages(prev => [...prev, diagnosisMessage]);

        // Add to conversation history
        setConversationHistory(prev => [...prev, { 
          role: 'assistant', 
          content: diagnosisMessage.message 
        }]);

        // Show completion options
        setTimeout(() => {
          const completionMessage: ChatMessage = {
            id: (Date.now() + 2).toString(),
            sender: 'agent',
            message: "Would you like me to help you proceed with this service request using this diagnosis?",
            timestamp: new Date(),
            type: 'suggestion'
          };
          setMessages(prev => [...prev, completionMessage]);
        }, 2000);

      } else {
        // Continue conversation
        const agentMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          sender: 'agent',
          message: response.message,
          timestamp: new Date(),
          type: 'question'
        };

        setMessages(prev => [...prev, agentMessage]);
        
        // Add to conversation history
        setConversationHistory(prev => [...prev, { 
          role: 'assistant', 
          content: response.message 
        }]);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'agent',
        message: "I'm having trouble processing that. Can you try describing your problem again?",
        timestamp: new Date(),
        type: 'question'
      };
      
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const handleUseDiagnosis = () => {
    if (lastDiagnosis) {
      // Use the stored diagnosis object directly
      onDiagnosisComplete(lastDiagnosis);
    } else {
      // Fallback if somehow no diagnosis was stored
      const fallbackDiagnosis: DiagnosisResult = {
        category: 'General Vehicle Issue',
        confidence: 70,
        suggestedService: 'Professional Diagnostic Service',
        description: 'Based on our conversation, your vehicle needs professional attention.',
        urgency: 'medium',
        reasoning: 'AI conversation analysis completed'
      };
      onDiagnosisComplete(fallbackDiagnosis);
    }
    onClose();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg h-[80vh] max-h-[600px] min-h-[400px] flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b flex-shrink-0">
          <CardTitle className="flex items-center text-lg">
            <Bot className="h-5 w-5 mr-2 text-primary" />
            AI Diagnosis Assistant
            <div className="flex items-center ml-2">
              {isLLMAvailable === null ? (
                <Badge variant="secondary" className="text-xs">
                  <Cpu className="h-3 w-3 mr-1" />
                  Checking...
                </Badge>
              ) : isLLMAvailable ? (
                <Badge variant="default" className="text-xs bg-green-500">
                  <Cpu className="h-3 w-3 mr-1" />
                  Llama 3.2
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  <Cpu className="h-3 w-3 mr-1" />
                  Offline
                </Badge>
              )}
            </div>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col p-0 min-h-0">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start space-x-3 ${
                  msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.sender === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {msg.sender === 'user' ? (
                    <UserIcon className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                
                <div className="flex-1 space-y-1">
                  <div className={`inline-block max-w-xs px-4 py-2 rounded-lg text-sm whitespace-pre-wrap ${
                    msg.sender === 'user'
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : msg.type === 'diagnosis'
                      ? 'bg-blue-50 text-blue-900 border border-blue-200'
                      : msg.type === 'question'
                      ? 'bg-amber-50 text-amber-900 border border-amber-200'
                      : 'bg-muted text-foreground'
                  }`}>
                    {msg.type === 'diagnosis' && (
                      <div className="flex items-center mb-2">
                        <Lightbulb className="h-4 w-4 mr-2" />
                        <Badge variant="secondary" className="text-xs">Diagnosis</Badge>
                      </div>
                    )}
                    {msg.type === 'question' && (
                      <div className="flex items-center mb-2">
                        <MessageCircle className="h-4 w-4 mr-2" />
                        <Badge variant="secondary" className="text-xs">Question</Badge>
                      </div>
                    )}
                    {msg.message}
                  </div>
                  
                  {msg.type === 'suggestion' && (
                    <div className="mt-2 space-x-2">
                      <Button size="sm" onClick={handleUseDiagnosis}>
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Use This Diagnosis
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => {
                        setMessages([{
                          id: '1',
                          sender: 'agent',
                          message: `Let's start over. What issue are you experiencing with your ${vehicleType.toLowerCase()}?`,
                          timestamp: new Date(),
                          type: 'question'
                        }]);
                        setConversationHistory([]);
                        setLastDiagnosis(null);
                      }}>
                        Start Over
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted px-4 py-2 rounded-lg text-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Auto-scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t p-4 flex-shrink-0">
            <div className="flex space-x-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Describe your problem..."
                onKeyPress={handleKeyPress}
                disabled={isTyping}
                className="flex-1"
              />
              <Button onClick={sendMessage} disabled={!newMessage.trim() || isTyping} className="flex-shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground text-center">
              Press Enter to send • Be as detailed as possible
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProblemDiagnosisAgent;