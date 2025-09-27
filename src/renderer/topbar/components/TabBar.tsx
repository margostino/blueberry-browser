import { cn } from '@common/utils/utils'
import { Plus, X } from 'lucide-react'
import React, { useCallback } from 'react'
import { Favicon } from '../components/Favicon'
import { TabBarButton } from '../components/TabBarButton'
import { useBrowser } from '../contexts/BrowserContext'
interface TabItemProps {
    id: string
    title: string
    favicon?: string | null
    isActive: boolean
    isPinned?: boolean
    onClose: () => void
    onActivate: () => void
}
const TabItem = React.memo<TabItemProps>(({
    title,
    favicon,
    isActive,
    isPinned = false,
    onClose,
    onActivate
}) => {
    const baseClassName = cn(
        "relative flex items-center h-8 pl-2 pr-1.5 select-none rounded-md",
        "text-primary group/tab transition-all duration-200 cursor-pointer",
        "app-region-no-drag", 
        isActive
            ? "bg-background shadow-tab dark:bg-secondary dark:shadow-none"
            : "bg-transparent hover:bg-muted/50 dark:hover:bg-muted/30",
        isPinned ? "w-8 !px-0 justify-center" : ""
    )
    return (
        <div className="py-1 px-0.5">
            <div
                className={baseClassName}
                onClick={() => !isActive && onActivate()}
            >
                {}
                <div className={cn(!isPinned && "mr-2")}>
                    <Favicon src={favicon} />
                </div>
                {}
                {!isPinned && (
                    <span className="text-xs truncate max-w-[200px] flex-1">
                        {title || 'New Tab'}
                    </span>
                )}
                {}
                {!isPinned && (
                    <div
                        onClick={(e) => {
                            e.stopPropagation()
                            onClose()
                        }}
                        className={cn(
                            "flex-shrink-0 p-1 rounded-md transition-opacity",
                            "hover:bg-muted dark:hover:bg-muted/50",
                            "opacity-0 group-hover/tab:opacity-100",
                            isActive && "opacity-100"
                        )}
                    >
                        <X className="size-3 text-primary dark:text-primary" />
                    </div>
                )}
            </div>
        </div>
    )
})
export const TabBar: React.FC = React.memo(() => {
    const { tabs, createTab, closeTab, switchTab } = useBrowser()
    
    const handleCreateTab = useCallback(() => {
        createTab('https://margostino.com')
    }, [createTab])
    
    const getFavicon = useCallback((url: string) => {
        try {
            const domain = new URL(url).hostname
            return `https://favicon.margostino.com/${domain}`
        } catch {
            return null
        }
    }, [])
    return (
        <div className="flex-1 overflow-x-hidden flex items-center">
            {}
            <div className="pl-20" />
            {}
            <div className="flex-1 overflow-x-auto flex">
                {tabs.map(tab => (
                    <TabItem
                        key={tab.id}
                        id={tab.id}
                        title={tab.title}
                        favicon={getFavicon(tab.url)}
                        isActive={tab.isActive}
                        onClose={() => closeTab(tab.id)}
                        onActivate={() => switchTab(tab.id)}
                    />
                ))}
            </div>
            {}
            <div className="pl-1 pr-2">
                <TabBarButton
                    Icon={Plus}
                    onClick={handleCreateTab}
                />
            </div>
        </div>
    )
})
