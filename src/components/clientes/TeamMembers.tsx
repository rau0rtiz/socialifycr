import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Trash2, Clock, Mail } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { InviteClientDialog } from './InviteClientDialog';

interface TeamMember {
  id: string;
  user_id: string;
  role: 'account_manager' | 'editor' | 'viewer';
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
}

interface TeamMembersProps {
  clientId: string;
  clientName: string;
}

const roleLabels = {
  account_manager: 'Account Manager',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const TeamMembers = ({ clientId, clientName }: TeamMembersProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
    fetchPendingInvites();
  }, [clientId]);

  const fetchMembers = async () => {
    const { data, error } = await supabase
      .from('client_team_members')
      .select(`
        id,
        user_id,
        role,
        profiles:user_id (
          full_name,
          email,
          avatar_url
        )
      `)
      .eq('client_id', clientId);

    if (error) {
      console.error('Error fetching team members:', error);
    } else {
      const transformedData = (data || []).map((member: any) => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        profile: member.profiles,
      }));
      setMembers(transformedData);
    }
    setLoading(false);
  };

  const fetchPendingInvites = async () => {
    const { data, error } = await supabase
      .from('client_invitations')
      .select('id, email, role, created_at, expires_at')
      .eq('client_id', clientId)
      .is('accepted_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching pending invites:', error);
    } else {
      setPendingInvites(data || []);
    }
  };

  const handleUpdateRole = async (memberId: string, newRole: 'account_manager' | 'editor' | 'viewer') => {
    const { error } = await supabase
      .from('client_team_members')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el rol.',
        variant: 'destructive',
      });
    } else {
      fetchMembers();
      toast({
        title: 'Rol actualizado',
        description: 'El rol del miembro ha sido actualizado.',
      });
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    const { error } = await supabase
      .from('client_team_members')
      .delete()
      .eq('id', memberId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el miembro.',
        variant: 'destructive',
      });
    } else {
      fetchMembers();
      toast({
        title: 'Miembro eliminado',
        description: 'El miembro ha sido removido del equipo.',
      });
    }
  };

  const handleCancelInvite = async (inviteId: string) => {
    const { error } = await supabase
      .from('client_invitations')
      .delete()
      .eq('id', inviteId);

    if (error) {
      toast({
        title: 'Error',
        description: 'No se pudo cancelar la invitación.',
        variant: 'destructive',
      });
    } else {
      fetchPendingInvites();
      toast({
        title: 'Invitación cancelada',
        description: 'La invitación ha sido cancelada.',
      });
    }
  };

  const handleInviteCreated = () => {
    fetchPendingInvites();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Equipo</h4>
        <Button variant="ghost" size="sm" onClick={() => setInviteDialogOpen(true)}>
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {/* Active members */}
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-2 rounded-lg border bg-card"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={member.profile?.avatar_url || undefined} />
                <AvatarFallback>
                  {member.profile?.full_name?.charAt(0) || member.profile?.email?.charAt(0) || '?'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">
                  {member.profile?.full_name || member.profile?.email || 'Usuario'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {member.profile?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={member.role}
                onValueChange={(value: 'account_manager' | 'editor' | 'viewer') => handleUpdateRole(member.id, value)}
              >
                <SelectTrigger className="w-32 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="account_manager">Account Manager</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleRemoveMember(member.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {/* Pending invitations */}
        {pendingInvites.map((invite) => (
          <div
            key={invite.id}
            className="flex items-center justify-between p-2 rounded-lg border border-dashed bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                <Mail className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">{invite.email}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Pendiente</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {roleLabels[invite.role as keyof typeof roleLabels] || invite.role}
              </Badge>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive"
                onClick={() => handleCancelInvite(invite.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}

        {members.length === 0 && pendingInvites.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay miembros en el equipo
          </p>
        )}
      </div>

      <InviteClientDialog
        open={inviteDialogOpen}
        onOpenChange={setInviteDialogOpen}
        clientId={clientId}
        clientName={clientName}
        onInviteCreated={handleInviteCreated}
      />
    </div>
  );
};
