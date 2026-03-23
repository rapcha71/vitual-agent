import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { ChevronLeft, Send, MessageCircle, Loader2, Users, User as UserIcon } from 'lucide-react';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Message, User } from '@shared/schema';

type MessageWithSender = Message & { sender: User };

export default function MessagesPage() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [newMessage, setNewMessage] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [sendMode, setSendMode] = useState<'all' | 'specific'>('all');

  const { data: messages = [], isLoading: messagesLoading } = useQuery<MessageWithSender[]>({
    queryKey: ['/api/messages'],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/admin/users'],
    enabled: user?.isSuperAdmin === true,
  });

  const sendToAdminMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/messages/to-admin', { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setNewMessage('');
      toast({
        title: "Mensaje enviado",
        description: "Tu mensaje fue enviado al administrador",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    },
  });

  const sendToUserMutation = useMutation({
    mutationFn: async ({ userId, content }: { userId: number; content: string }) => {
      const response = await apiRequest('POST', `/api/messages/to-user/${userId}`, { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setNewMessage('');
      setSelectedUserId('');
      toast({
        title: "Mensaje enviado",
        description: "El mensaje fue enviado al usuario",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    },
  });

  const sendBroadcastMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/messages/broadcast', { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      setNewMessage('');
      toast({
        title: "Mensaje enviado",
        description: "El mensaje fue enviado a todos los usuarios",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "No se pudo enviar el mensaje",
        variant: "destructive",
      });
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (messageId: number) => {
      const response = await apiRequest('POST', `/api/messages/${messageId}/read`, {});
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/messages'] });
      queryClient.invalidateQueries({ queryKey: ['/api/messages/unread/count'] });
    },
  });

  const handleSendToAdmin = () => {
    if (!newMessage.trim()) return;
    sendToAdminMutation.mutate(newMessage);
  };

  const handleSendToUser = () => {
    if (!newMessage.trim() || !selectedUserId) return;
    sendToUserMutation.mutate({ userId: parseInt(selectedUserId), content: newMessage });
  };

  const handleSendBroadcast = () => {
    if (!newMessage.trim()) return;
    sendBroadcastMutation.mutate(newMessage);
  };

  const handleSuperAdminSend = () => {
    if (sendMode === 'all') {
      handleSendBroadcast();
    } else {
      handleSendToUser();
    }
  };

  const isUnread = (message: MessageWithSender) => {
    return message.unreadByUsers?.includes(user?.id || 0);
  };

  const handleMessageClick = (message: MessageWithSender) => {
    if (isUnread(message)) {
      markAsReadMutation.mutate(message.id);
    }
  };

  const myMessages = messages.filter(m => {
    if (!user) return false;
    
    const userId = Number(user.id);
    const senderId = Number(m.senderId);
    const recipientId = m.recipientId !== null && m.recipientId !== undefined ? Number(m.recipientId) : null;
    
    const isSentByMe = senderId === userId;
    const isForMe = recipientId !== null && recipientId === userId;
    const isBroadcast = recipientId === null && senderId !== userId;
    
    return isSentByMe || isForMe || isBroadcast;
  });

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-[#F05023] text-white p-3 sticky top-0 z-10">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-white/80 p-0 relative z-10"
            onClick={() => setLocation("/")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center">
            <img
              src="/assets/logo-full.png"
              alt="Virtual Agent"
              className="h-14 w-auto max-w-[60vw] object-contain header-logo-2x"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:text-white/80 p-0 relative z-10"
            onClick={() => logoutMutation.mutate()}
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        <h1 className="text-xl font-bold">Mensajes</h1>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">
              {user?.isSuperAdmin ? 'Enviar mensaje' : 'Enviar mensaje al administrador'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {user?.isSuperAdmin ? (
              <>
                <RadioGroup value={sendMode} onValueChange={(value) => setSendMode(value as 'all' | 'specific')} className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="all" />
                    <Label htmlFor="all" className="flex items-center gap-1 cursor-pointer">
                      <Users className="h-4 w-4" />
                      Todos los usuarios
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="specific" id="specific" />
                    <Label htmlFor="specific" className="flex items-center gap-1 cursor-pointer">
                      <UserIcon className="h-4 w-4" />
                      Usuario específico
                    </Label>
                  </div>
                </RadioGroup>

                {sendMode === 'specific' && (
                  <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar usuario" />
                    </SelectTrigger>
                    <SelectContent className="bg-app-surface border-app-surface-border text-gray-900 [&_[data-highlighted]]:bg-app-surface-hover">
                      {users.filter(u => u.id !== user.id).map(u => (
                        <SelectItem key={u.id} value={u.id.toString()}>
                          {u.fullName || u.username}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Textarea
                  placeholder={sendMode === 'all' ? "Escribe tu mensaje para todos los usuarios..." : "Escribe tu mensaje..."}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleSuperAdminSend} 
                  disabled={
                    (sendToUserMutation.isPending || sendBroadcastMutation.isPending) || 
                    !newMessage.trim() || 
                    (sendMode === 'specific' && !selectedUserId)
                  }
                  className="w-full"
                >
                  {(sendToUserMutation.isPending || sendBroadcastMutation.isPending) ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  {sendMode === 'all' ? 'Enviar a todos' : 'Enviar'}
                </Button>
              </>
            ) : (
              <>
                <Textarea
                  placeholder="Escribe tu mensaje al administrador..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  rows={3}
                />
                <Button 
                  onClick={handleSendToAdmin} 
                  disabled={sendToAdminMutation.isPending || !newMessage.trim()}
                  className="w-full"
                >
                  {sendToAdminMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Historial de mensajes</CardTitle>
          </CardHeader>
          <CardContent>
            {messagesLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : myMessages.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No hay mensajes</p>
            ) : (
              <div className="space-y-3">
                {myMessages.map(message => (
                  <div
                    key={message.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      isUnread(message) 
                        ? 'bg-orange-50 border-orange-200 font-medium' 
                        : 'bg-white'
                    } ${message.senderId === user?.id ? 'ml-8' : 'mr-8'}`}
                    onClick={() => handleMessageClick(message)}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className={`text-sm ${message.senderId === user?.id ? 'text-blue-600' : 'text-green-600'}`}>
                        {message.senderId === user?.id ? 'Tú' : (message.sender?.fullName || message.sender?.username || 'Admin')}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {message.createdAt ? new Date(message.createdAt).toLocaleString('es-CR') : ''}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                    {isUnread(message) && (
                      <span className="inline-block mt-1 text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full">
                        Nuevo
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
