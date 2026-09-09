import React, { useEffect, useState } from "react";
import {
  CalendarEvent,
  ChannelType,
  ContentItem,
  ContentVariant,
  Conversation,
  LeadCalculation,
  MediaAsset,
  NavView,
  PostPerformance,
  Project,
  UserRole,
} from "./types";
import {
  INITIAL_CALENDAR_EVENTS,
  INITIAL_CONNECTORS,
  INITIAL_CONTENT_ITEMS,
  INITIAL_CONVERSATIONS,
  INITIAL_MEDIA_ASSETS,
  INITIAL_POST_PERFORMANCES,
  INITIAL_PROJECTS,
} from "./mockData";
import { Sidebar } from "./components/Sidebar";
import { ChatPanel } from "./components/ChatPanel";
import { RightPanel } from "./components/RightPanel";
import { ContentWorkspace } from "./components/ContentWorkspace";
import { CalendarView } from "./components/CalendarView";
import { MediaLibraryView } from "./components/MediaLibraryView";
import { AccountsView } from "./components/AccountsView";
import { BackendCodeView } from "./components/BackendCodeView";
import { AnalyticsView } from "./components/AnalyticsView";

export default function App() {
  // Navigation & Project state
  const [currentView, setCurrentView] = useState<NavView>("dialogs");
  const [userRole, setUserRole] = useState<UserRole>("owner");
  const [projects, setProjects] = useState<Project[]>(INITIAL_PROJECTS);
  const [activeProject, setActiveProject] = useState<Project>(INITIAL_PROJECTS[0]);

  // Data states
  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(
    INITIAL_CONVERSATIONS.find((c) => c.project_id === INITIAL_PROJECTS[0].id)?.id ||
      INITIAL_CONVERSATIONS[0].id,
  );
  const [contentItems, setContentItems] = useState<ContentItem[]>(INITIAL_CONTENT_ITEMS);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(INITIAL_CALENDAR_EVENTS);
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>(INITIAL_MEDIA_ASSETS);
  const [connectors, setConnectors] = useState(INITIAL_CONNECTORS);
  const [performances, setPerformances] = useState<PostPerformance[]>(INITIAL_POST_PERFORMANCES);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("phoenix_theme") === "dark";
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("phoenix_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("phoenix_theme", "light");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode((prev) => !prev);

  // Inter-view navigation state (e.g. Calendar event -> Content workspace)
  const [targetContentItemId, setTargetContentItemId] = useState<string | null>(null);
  const [targetContentChannel, setTargetContentChannel] = useState<ChannelType | null>(null);

  const handleNavigateToContent = (itemId: string, channel?: ChannelType) => {
    setTargetContentItemId(itemId);
    if (channel) setTargetContentChannel(channel);
    setCurrentView("content");
  };

  // Calendar Drag and Drop / date update handler
  const handleUpdateEventDate = (eventId: string, newDateIso: string) => {
    setCalendarEvents((prev) =>
      prev.map((ev) => (ev.id === eventId ? { ...ev, scheduled_at: newDateIso } : ev)),
    );
  };

  // Calendar Publish handler
  const handlePublishCalendarEvent = (event: CalendarEvent) => {
    setCalendarEvents((prev) =>
      prev.map((e) => (e.id === event.id ? { ...e, status: "published" } : e)),
    );
    setPerformances((prev) => {
      const existing = prev.find(
        (p) => p.content_item_id === event.content_item_id && p.channel === event.channel,
      );
      if (existing) {
        return prev.map((p) =>
          p.id === existing.id
            ? {
                ...p,
                published_at: new Date().toISOString(),
                last_synced_at: new Date().toISOString(),
              }
            : p,
        );
      }
      const newPerf: PostPerformance = {
        id: `perf-${Date.now()}`,
        project_id: activeProject.id,
        content_item_id: event.content_item_id,
        content_title: event.content_title,
        channel: event.channel,
        views_count: Math.floor(Math.random() * 40) + 15,
        likes_count: Math.floor(Math.random() * 6) + 1,
        comments_count: 0,
        shares_count: 0,
        leads_count: 1,
        measurements_count: 0,
        conversion_rate: 5.5,
        published_at: new Date().toISOString(),
        last_synced_at: new Date().toISOString(),
      };
      return [newPerf, ...prev];
    });
  };

  // 10-second Polling mechanism for real-time synchronization
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setIsPolling(true);
      setTimeout(() => {
        setIsPolling(false);
      }, 600);
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  const handleManualPoll = () => {
    setIsPolling(true);
    setTimeout(() => {
      setIsPolling(false);
    }, 600);
  };

  const handleRoleChange = (newRole: UserRole) => {
    setUserRole(newRole);
    if (newRole === "manager") {
      if (currentView === "accounts" || currentView === "backend" || currentView === "analytics") {
        setCurrentView("dialogs");
      }
    }
  };

  // Filter states
  const [channelFilter, setChannelFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [temperatureFilter, setTemperatureFilter] = useState("all");
  const [attentionOnly, setAttentionOnly] = useState(false);

  // Panel sizing
  const [leftWidth, setLeftWidth] = useState(310);
  const [rightWidth, setRightWidth] = useState(340);
  const [isResizingLeft, setIsResizingLeft] = useState(false);
  const [isResizingRight, setIsResizingRight] = useState(false);

  // Resizing logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizingLeft) {
        const newWidth = Math.max(240, Math.min(480, e.clientX));
        setLeftWidth(newWidth);
      } else if (isResizingRight) {
        const newWidth = Math.max(260, Math.min(520, window.innerWidth - e.clientX));
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizingLeft(false);
      setIsResizingRight(false);
    };

    if (isResizingLeft || isResizingRight) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizingLeft, isResizingRight]);

  // Active selected conversation
  const selectedConversation =
    conversations.find((c) => c.id === selectedConvId) || null;

  // Total unread for current active project
  const unreadTotal = conversations
    .filter((c) => c.project_id === activeProject.id)
    .reduce((sum, c) => sum + c.unread_count, 0);

  // When project changes, pick first available conversation
  const handleSelectProject = (proj: Project) => {
    setActiveProject(proj);
    const firstInProj = conversations.find((c) => c.project_id === proj.id);
    if (firstInProj) {
      setSelectedConvId(firstInProj.id);
    } else {
      setSelectedConvId(null);
    }
  };

  // Create new project / niche
  const handleCreateProject = (
    name: string,
    nicheType: Project["niche_type"],
    desc: string,
  ) => {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      name,
      slug: name.toLowerCase().replace(/\s+/g, "-"),
      niche_type: nicheType,
      description: desc,
      knowledge_dir: `/app/knowledge/${name.toLowerCase().replace(/\s+/g, "_")}`,
      system_prompt: `Ты AI-помощник компании ${name}. Консультируй клиентов, отвечай дружелюбно и веди к заявке / замеру.`,
      is_active: true,
      color: "#4f46e5",
      created_at: new Date().toISOString(),
    };

    setProjects([...projects, newProj]);
    setActiveProject(newProj);
    setSelectedConvId(null);
  };

  // Mark conversation as read (local + connector sync)
  const handleMarkRead = (convId: string) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id !== convId) return conv;
        return {
          ...conv,
          unread_count: 0,
          messages: conv.messages.map((m) =>
            m.direction === "inbound" && !m.is_read
              ? { ...m, is_read: true, read_at: new Date().toISOString() }
              : m,
          ),
        };
      }),
    );
  };

  // Automatically mark read when selecting conversation
  const handleSelectConversation = (id: string) => {
    setSelectedConvId(id);
    handleMarkRead(id);
  };

  // Send message
  const handleSendMessage = (text: string) => {
    if (!selectedConvId) return;
    const now = new Date().toISOString();
    const newMsg = {
      id: `msg-${Date.now()}`,
      conversation_id: selectedConvId,
      direction: "outbound" as const,
      sender_type: "operator" as const,
      text,
      delivery_status: "delivered",
      is_read: true,
      read_at: now,
      created_at: now,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== selectedConvId) return c;
        return {
          ...c,
          last_text: text,
          last_message_at: now,
          messages: [...c.messages, newMsg],
          pending_suggestion: null,
        };
      }),
    );
  };

  // Suggestion actions
  const handleAcceptSuggestion = (text: string) => {
    handleSendMessage(text);
  };

  const handleRewriteSuggestion = (
    convId: string,
    sugId: string,
    feedback: string,
  ) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId || !c.pending_suggestion) return c;
        const rewritten = `${c.pending_suggestion.suggested_text} (переписано с учетом: «${feedback || "короче"}»)`;
        return {
          ...c,
          pending_suggestion: {
            ...c.pending_suggestion,
            suggested_text: rewritten,
            confidence: 0.94,
          },
        };
      }),
    );
  };

  const handleRejectSuggestion = (convId: string, sugId: string) => {
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== convId || !c.pending_suggestion) return c;
        return {
          ...c,
          pending_suggestion: {
            ...c.pending_suggestion,
            status: "rejected",
          },
        };
      }),
    );
  };

  // Lead update
  const handleUpdateLead = (updates: Partial<Conversation["lead"]>) => {
    if (!selectedConvId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== selectedConvId || !c.lead) return c;
        return {
          ...c,
          lead: {
            ...c.lead,
            ...updates,
            updated_at: new Date().toISOString(),
          },
        };
      }),
    );
  };

  // Calculation update
  const handleUpdateCalculation = (calcUpdates: Partial<LeadCalculation>) => {
    if (!selectedConvId) return;
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id !== selectedConvId) return c;
        const currentCalc = c.calculation || {
          id: `calc-${Date.now()}`,
          lead_id: c.lead?.id || "",
          conversation_id: c.id,
        };
        return {
          ...c,
          calculation: {
            ...currentCalc,
            ...calcUpdates,
          },
        };
      }),
    );
  };

  // Content actions
  const handleCreateContentItem = (itemData: Partial<ContentItem>) => {
    const newItem: ContentItem = {
      id: `cnt-${Date.now()}`,
      project_id: itemData.project_id || activeProject.id,
      title: itemData.title || "Новый материал",
      topic: itemData.topic || "",
      rubric: itemData.rubric || "Общее",
      goal: itemData.goal || "lead_generation",
      offer: itemData.offer || "",
      trigger_keyword: itemData.trigger_keyword || "ЗАМЕР",
      status: itemData.status || "idea",
      variants: itemData.variants || [],
      media_assets: itemData.media_assets || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setContentItems([newItem, ...contentItems]);
  };

  const handleUpdateVariantText = (
    itemId: string,
    variantId: string,
    text: string,
    channel?: ChannelType,
  ) => {
    setContentItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const exists = item.variants.some((v) => v.id === variantId || (channel && v.channel === channel));
        if (exists) {
          return {
            ...item,
            variants: item.variants.map((v) =>
              v.id === variantId || (channel && v.channel === channel) ? { ...v, text } : v,
            ),
          };
        } else if (channel) {
          const newVariant: ContentVariant = {
            id: variantId,
            content_item_id: itemId,
            channel,
            title: item.title,
            text,
            format: "post",
            status: "draft",
          };
          return {
            ...item,
            variants: [...item.variants, newVariant],
          };
        }
        return item;
      }),
    );
  };

  const handleScheduleVariant = (
    itemId: string,
    variantId: string,
    channel: ChannelType,
    text: string,
  ) => {
    const item = contentItems.find((i) => i.id === itemId);
    const newEvent: CalendarEvent = {
      id: `ev-${Date.now()}`,
      content_item_id: itemId,
      content_variant_id: variantId,
      content_title: item?.title || "Публикация",
      channel,
      text,
      scheduled_at: "2026-09-15T12:00:00Z",
      status: "scheduled",
    };
    setCalendarEvents([...calendarEvents, newEvent]);

    // Автоматическое создание записи отслеживания в PostPerformance
    const newPerf: PostPerformance = {
      id: `perf-${Date.now()}`,
      project_id: activeProject.id,
      content_item_id: itemId,
      content_title: item?.title || "Новая публикация",
      channel,
      views_count: 0,
      likes_count: 0,
      comments_count: 0,
      shares_count: 0,
      leads_count: 0,
      measurements_count: 0,
      conversion_rate: 0,
      published_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    };
    setPerformances((prev) => [newPerf, ...prev]);
  };

  const handleUploadMedia = (asset: Partial<MediaAsset>) => {
    const newMedia: MediaAsset = {
      id: `med-${Date.now()}`,
      project_id: asset.project_id || activeProject.id,
      title: asset.title || "Медиа",
      asset_type: asset.asset_type || "photo",
      url: asset.url || "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800",
      description: asset.description || "",
      tags: asset.tags || [],
      created_at: new Date().toISOString(),
    };
    setMediaAssets([newMedia, ...mediaAssets]);
  };

  const handleUpdateItemMedia = (itemId: string, media: MediaAsset[]) => {
    setContentItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, media_assets: media } : item,
      ),
    );
  };

  const handleMergeContacts = (
    mainContactId: string,
    duplicateContactId: string,
  ) => {
    setConversations((prev) => {
      const mainConv = prev.find((c) => c.contact_id === mainContactId);
      const dupConv = prev.find((c) => c.contact_id === duplicateContactId);
      if (!mainConv || !dupConv) return prev;

      // Merge contact info: fill missing phone/city
      const mergedContact = {
        ...mainConv.contact,
        phone: mainConv.contact.phone || dupConv.contact.phone,
        city: mainConv.contact.city || dupConv.contact.city,
        notes: [mainConv.contact.notes, dupConv.contact.notes]
          .filter(Boolean)
          .join(" | "),
      };

      // Reassign all conversations from duplicate to mainContact
      return prev.map((c) => {
        if (c.contact_id === duplicateContactId) {
          return {
            ...c,
            contact_id: mainContactId,
            contact: mergedContact,
            lead: {
              ...(c.lead || mainConv.lead!),
              contact_id: mainContactId,
            },
          };
        }
        if (c.contact_id === mainContactId) {
          return {
            ...c,
            contact: mergedContact,
          };
        }
        return c;
      });
    });
  };

  const handleSyncPerformance = () => {
    setPerformances((prev) =>
      prev.map((p) => ({
        ...p,
        views_count: p.views_count + Math.floor(Math.random() * 45) + 10,
        likes_count: p.likes_count + Math.floor(Math.random() * 5) + 1,
        last_synced_at: new Date().toISOString(),
      })),
    );
  };

  const handleTriggerAlarmTest = () => {
    // Всплывающее системное событие проверки тревоги
  };

  const handleTriggerMorningSummaryTest = () => {
    // Всплывающее системное событие утренней сводки
  };

  return (
    <div className="flex h-screen w-screen bg-zinc-100 dark:bg-zinc-950 overflow-hidden font-sans antialiased text-zinc-900 dark:text-zinc-100">
      {/* 1. Left Resizable Navigation & Dialogs Panel */}
      <div
        style={{ width: `${leftWidth}px` }}
        className="h-full flex-shrink-0 flex flex-col relative"
      >
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          userRole={userRole}
          onRoleChange={handleRoleChange}
          isDarkMode={isDarkMode}
          onToggleDarkMode={toggleDarkMode}
          isPolling={isPolling}
          onManualPoll={handleManualPoll}
          projects={projects}
          activeProject={activeProject}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          conversations={conversations}
          selectedConversationId={selectedConvId}
          onSelectConversation={handleSelectConversation}
          channelFilter={channelFilter}
          onSelectChannelFilter={setChannelFilter}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          temperatureFilter={temperatureFilter}
          onTemperatureFilterChange={setTemperatureFilter}
          attentionOnly={attentionOnly}
          onToggleAttentionOnly={() => setAttentionOnly(!attentionOnly)}
          unreadTotal={unreadTotal}
        />

        {/* Left resize handle */}
        <div
          onMouseDown={() => setIsResizingLeft(true)}
          className="absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-teal-500/40 transition-colors z-20"
        />
      </div>

      {/* 2. Main Central Area */}
      <div className="flex-1 h-full flex flex-col min-w-0 bg-white dark:bg-zinc-900 relative">
        {currentView === "dialogs" && (
          <div className="flex-1 flex h-full min-w-0">
            {/* Center Chat Timeline */}
            <ChatPanel
              conversation={selectedConversation}
              onSendMessage={handleSendMessage}
              onMarkRead={handleMarkRead}
              onAcceptSuggestion={handleAcceptSuggestion}
              onRewriteSuggestion={handleRewriteSuggestion}
              onRejectSuggestion={handleRejectSuggestion}
            />

            {/* Right Resizer Handle */}
            <div
              onMouseDown={() => setIsResizingRight(true)}
              className="w-1.5 h-full cursor-col-resize hover:bg-teal-500/40 transition-colors z-20 shrink-0"
            />

            {/* Right Inspector Panel */}
            <div
              style={{ width: `${rightWidth}px` }}
              className="h-full flex-shrink-0"
            >
              <RightPanel
                activeProject={activeProject}
                conversation={selectedConversation}
                allConversations={conversations}
                onUpdateLead={handleUpdateLead}
                onUpdateCalculation={handleUpdateCalculation}
                onMergeContacts={handleMergeContacts}
              />
            </div>
          </div>
        )}

        {currentView === "content" && (
          <ContentWorkspace
            activeProject={activeProject}
            contentItems={contentItems}
            allMediaAssets={mediaAssets}
            initialItemId={targetContentItemId}
            initialChannelTab={targetContentChannel}
            onCreateContentItem={handleCreateContentItem}
            onUpdateVariantText={handleUpdateVariantText}
            onScheduleVariant={handleScheduleVariant}
            onUpdateItemMedia={handleUpdateItemMedia}
            onUploadMedia={handleUploadMedia}
          />
        )}

        {currentView === "calendar" && (
          <CalendarView
            activeProject={activeProject}
            events={calendarEvents}
            onUpdateEventDate={handleUpdateEventDate}
            onNavigateToContent={handleNavigateToContent}
            onPublishNow={handlePublishCalendarEvent}
          />
        )}

        {currentView === "media" && (
          <MediaLibraryView
            activeProject={activeProject}
            mediaAssets={mediaAssets}
            onUploadMedia={handleUploadMedia}
          />
        )}

        {currentView === "analytics" && (
          <AnalyticsView
            activeProject={activeProject}
            conversations={conversations}
            performances={performances}
            onSyncPerformance={handleSyncPerformance}
            onTriggerAlarmTest={handleTriggerAlarmTest}
            onTriggerMorningSummaryTest={handleTriggerMorningSummaryTest}
          />
        )}

        {currentView === "accounts" && (
          <AccountsView connectors={connectors} />
        )}

        {currentView === "backend" && <BackendCodeView />}
      </div>
    </div>
  );
}
