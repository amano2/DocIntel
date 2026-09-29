import SidebarLayout from '../components/SidebarLayout';
import ChatInterface from '../components/ChatInterface';

export default function AskPage() {
  return (
    <SidebarLayout>
      <div className="flex flex-col h-full w-full min-h-0 min-w-0 bg-transparent relative overflow-hidden">
        <ChatInterface className="flex-1 min-h-0 min-w-0 border-0 shadow-none" />
      </div>
    </SidebarLayout>
  );
}
