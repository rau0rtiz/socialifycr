import { MessageSquare } from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard/DashboardLayout';

const AgencyChats = () => {
  return (
    <DashboardLayout>
      <div className="flex flex-col items-center justify-center gap-4 min-h-[60vh] text-center">
        <div className="agency-card flex flex-col items-center gap-4 rounded-2xl px-10 py-12 max-w-sm">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/12 agency-neon">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-semibold text-foreground">Chats</h1>
            <p className="text-sm text-muted-foreground">
              Coming soon — esta sección estará disponible muy pronto.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AgencyChats;
