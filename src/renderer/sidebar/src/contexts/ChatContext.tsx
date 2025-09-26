import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
interface Message {
    id: string
    role: 'user' | 'assistant'
    content: string
    timestamp: number
    isStreaming?: boolean
}
interface ChatContextType {
    messages: Message[]
    isLoading: boolean
    sendMessage: (content: string) => Promise<void>
    clearChat: () => void
    getPageContent: () => Promise<string | null>
    getPageText: () => Promise<string | null>
    getCurrentUrl: () => Promise<string | null>
}
const ChatContext = createContext<ChatContextType | null>(null)
export const useChat = () => {
    const context = useContext(ChatContext)
    if (!context) {
        throw new Error('useChat must be used within a ChatProvider')
    }
    return context
}
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [messages, setMessages] = useState<Message[]>([])
    const [isLoading, setIsLoading] = useState(false)
    useEffect(() => {
        const loadMessages = async () => {
            try {
                const storedMessages = await window.sidebarAPI.getMessages()
                if (storedMessages && storedMessages.length > 0) {
                    const convertedMessages = storedMessages.map((msg: Message, index: number) => ({
                        id: `msg-${index}`,
                        role: msg.role,
                        content: typeof msg.content === 'string' 
                            ? msg.content 
                            : msg.content,
                        timestamp: Date.now(),
                        isStreaming: false
                    }))
                    setMessages(convertedMessages)
                }
            } catch (error) {
                console.error('Failed to load messages:', error)
            }
        }
        loadMessages()
    }, [])
    const sendMessage = useCallback(async (content: string) => {
        setIsLoading(true)
        try {
            const messageId = Date.now().toString()
            await window.sidebarAPI.sendChatMessage({
                message: content,
                messageId: messageId
            })
        } catch (error) {
            console.error('Failed to send message:', error)
        } finally {
            setIsLoading(false)
        }
    }, [])
    const clearChat = useCallback(async () => {
        try {
            await window.sidebarAPI.clearChat()
            setMessages([])
        } catch (error) {
            console.error('Failed to clear chat:', error)
        }
    }, [])
    const getPageContent = useCallback(async () => {
        try {
            return await window.sidebarAPI.getPageContent()
        } catch (error) {
            console.error('Failed to get page content:', error)
            return null
        }
    }, [])
    const getPageText = useCallback(async () => {
        try {
            return await window.sidebarAPI.getPageText()
        } catch (error) {
            console.error('Failed to get page text:', error)
            return null
        }
    }, [])
    const getCurrentUrl = useCallback(async () => {
        try {
            return await window.sidebarAPI.getCurrentUrl()
        } catch (error) {
            console.error('Failed to get current URL:', error)
            return null
        }
    }, [])
    useEffect(() => {
        const handleChatResponse = (data: { messageId: string; content: string; isComplete: boolean }) => {
            if (data.isComplete) {
                setIsLoading(false)
            }
        }
        const handleMessagesUpdated = (updatedMessages: any[]) => {
            const convertedMessages = updatedMessages.map((msg: any, index: number) => ({
                id: `msg-${index}`,
                role: msg.role,
                content: typeof msg.content === 'string' 
                    ? msg.content 
                    : msg.content.find((p: any) => p.type === 'text')?.text || '',
                timestamp: Date.now(),
                isStreaming: false
            }))
            setMessages(convertedMessages)
        }
        window.sidebarAPI.onChatResponse(handleChatResponse)
        window.sidebarAPI.onMessagesUpdated(handleMessagesUpdated)
        return () => {
            window.sidebarAPI.removeChatResponseListener()
            window.sidebarAPI.removeMessagesUpdatedListener()
        }
    }, [])
    const value: ChatContextType = {
        messages,
        isLoading,
        sendMessage,
        clearChat,
        getPageContent,
        getPageText,
        getCurrentUrl
    }
    return (
        <ChatContext.Provider value={value}>
            {children}
        </ChatContext.Provider>
    )
}
