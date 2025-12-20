import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { UserPlus, Trash2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

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

interface TeamMembersProps {
  clientId: string;
}

const roleLabels = {
  account_manager: 'Account Manager',
  editor: 'Editor',
  viewer: 'Viewer',
};

export const TeamMembers = ({ clientId }: TeamMembersProps) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMembers();
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
      // Transform the data to match our interface
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

  const handleAddMember = () => {
    toast({
      title: 'Agregar miembro',
      description: 'Para agregar miembros, primero deben estar registrados en la plataforma.',
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">Equipo</h4>
        <Button variant="ghost" size="sm" onClick={handleAddMember}>
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
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

        {members.length === 0 && !loading && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay miembros en el equipo
          </p>
        )}
      </div>
    </div>
  );
};
