import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { chatApi, type ChatMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Send, Loader2, Brain, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const GREETING: Message = {
  role: "assistant",
  content: "Hello! I'm TalentOS AI Recruiter. I can help you analyze candidates, compare profiles, interpret AI scores, and provide hiring insights. What would you like to know?",
  timestamp: new Date(),
};

function historyToMessages(history: ChatMessage[]): Message[] {
  const msgs: Message[] = [];
  for (const h of history) {
    msgs.push({ role: "user", content: h.query, timestamp: new Date(h.createdAt) });
    msgs.push({ role: "assistant", content: h.response, timestamp: new Date(h.createdAt) });
  }
  return msgs;
}

export default function Chat() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [input, setInput] = useState("");
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Load chat history on mount
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["chat-history", user?.id],
    queryFn: () => chatApi.history(user!.id),
    enabled: !!user?.id,
    retry: false,
  });

  // Populate messages from history once loaded
  useEffect(() => {
    if (historyLoaded || !history) return;
    const msgs = historyToMessages(history);
    setMessages(msgs.length > 0 ? msgs : [GREETING]);
    setHistoryLoaded(true);
  }, [history, historyLoaded]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = useMutation({
    mutationFn: (query: string) => chatApi.send(query),
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, timestamp: new Date(data.createdAt) },
      ]);
    },
    onError: (err) => {
      toast({ variant: "destructive", title: "Chat failed", description: String(err) });
    },
  });

  const handleSend = () => {
    const q = input.trim();
    if (!q || send.isPending) return;
    setMessages((prev) => [...prev, { role: "user", content: q, timestamp: new Date() }]);
    setInput("");
    send.mutate(q);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestions = [
    "Who are the top candidates by match score?",
    "Which candidates have the highest GitHub scores?",
    "Summarize candidates currently on hold",
    "What skills are most commonly missing?",
  ];

  const isOnlyGreeting = messages.length === 1 && messages[0].role === "assistant";

  return (
    <div className="flex flex-col h-screen max-h-screen p-0">
      {/* Header */}
      <div className="px-8 py-5 border-b border-slate-200 bg-white shrink-0">
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" /> AI Recruiter Chat
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">Ask questions about candidates, jobs, and hiring intelligence</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-8 py-6 bg-slate-50">
        {historyLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                <Skeleton className={`h-16 rounded-2xl ${i % 2 === 0 ? "w-48" : "w-64"}`} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === "assistant" ? "bg-indigo-600" : "bg-slate-700"}`}>
                  {msg.role === "assistant"
                    ? <Brain className="w-4 h-4 text-white" />
                    : <User className="w-4 h-4 text-white" />}
                </div>
                <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-white border border-slate-200 text-slate-800 shadow-sm"
                    : "bg-indigo-600 text-white"
                }`}>
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  <p className={`text-xs mt-1.5 ${msg.role === "assistant" ? "text-slate-400" : "text-indigo-200"}`}>
                    {msg.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}

            {send.isPending && (
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>
        )}
      </div>

      {/* Suggestions — shown when conversation has no user messages */}
      {isOnlyGreeting && !historyLoading && (
        <div className="px-8 pb-3 flex flex-wrap gap-2 bg-slate-50 shrink-0">
          {suggestions.map((s) => (
            <button
              key={s}
              onClick={() => setInput(s)}
              className="text-xs bg-white border border-slate-200 text-slate-600 px-3 py-1.5 rounded-full hover:border-indigo-300 hover:text-indigo-600 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-8 py-4 border-t border-slate-200 bg-white shrink-0">
        <div className="flex gap-3">
          <Textarea
            className="flex-1 resize-none text-sm"
            rows={2}
            placeholder="Ask about candidates, scores, hiring insights..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            className="shrink-0 self-end"
            onClick={handleSend}
            disabled={!input.trim() || send.isPending}
          >
            {send.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">Press Enter to send · Shift+Enter for new line</p>
      </div>
    </div>
  );
}
