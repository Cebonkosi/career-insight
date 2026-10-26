import { useState, useRef, useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'
import { toast } from 'sonner'
import { Sparkles } from 'lucide-react'
import { ChatBubble } from '@/components/chatbot/ChatBubble'
import { ChatInput } from '@/components/chatbot/ChatInput'
import { SuggestedPrompts } from '@/components/chatbot/SuggestedPrompts'
import { integrations } from '@/lib/integrations'

export default function CareerChatbot() {
  const { profile } = useOutletContext()
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(content) {
    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setLoading(true)
    try {
      const { reply } = await integrations.InvokeLLM({
        messages: nextMessages,
        studentContext: {
          grade: profile.grade,
          subjects: profile.subjects,
          interests: profile.interests,
        },
      })
      setMessages([...nextMessages, { role: 'assistant', content: reply }])
    } catch (error) {
      toast.error(error.message ?? 'Career Compass is unavailable right now')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-8rem)] max-w-xl flex-col p-4 md:h-[calc(100vh-4rem)]">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-accent" />
        <h1 className="font-display text-xl font-bold">Career Compass</h1>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto thin-scrollbar">
        {messages.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hi{profile.display_name ? ` ${profile.display_name}` : ''}! Ask me about careers, subjects, or study
              paths.
            </p>
            <SuggestedPrompts onSelect={sendMessage} />
          </div>
        )}

        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} profile={profile} />
        ))}

        {loading && <ChatBubble role="assistant" content="Thinking..." profile={profile} />}
        <div ref={scrollRef} />
      </div>

      <div className="mt-4">
        <ChatInput onSend={sendMessage} disabled={loading} />
      </div>
    </div>
  )
}
