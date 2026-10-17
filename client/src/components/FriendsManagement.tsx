import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Check, X, Users } from "lucide-react";
import type { Friend as FriendType } from "@shared/types";
import { useAuth } from "@/hooks/useAuth";

export function FriendsManagement() {
    const { toast } = useToast();
    const [emailToInvite, setEmailToInvite] = useState("");
    const [isInviteOpen, setIsInviteOpen] = useState(false);

    // Fetch Friends
    const { data: friends, isLoading: friendsLoading } = useQuery<FriendType[]>({
        queryKey: ['/api/friends'],
    });

    // Fetch Requests
    const { data: requests, isLoading: requestsLoading } = useQuery<FriendType[]>({
        queryKey: ['/api/friends/requests'],
    });

    // Send Request Mutation
    const sendRequestMutation = useMutation({
        mutationFn: async (email: string) => {
            const res = await apiRequest("POST", "/api/friends/request", { email });
            return res.json();
        },
        onSuccess: () => {
            toast({ title: "Request Sent", description: "Friend request sent successfully." });
            setIsInviteOpen(false);
            setEmailToInvite("");
        },
        onError: (error: any) => {
            toast({
                title: "Error",
                description: error.message || "Failed to send request",
                variant: "destructive"
            });
        }
    });

    // Accept Request Mutation
    const acceptRequestMutation = useMutation({
        mutationFn: async (id: number) => {
            await apiRequest("PATCH", `/api/friends/${id}/accept`);
        },
        onSuccess: () => {
            toast({ title: "Accepted", description: "Friend request accepted." });
            queryClient.invalidateQueries({ queryKey: ['/api/friends'] });
            queryClient.invalidateQueries({ queryKey: ['/api/friends/requests'] });
        },
        onError: () => {
            toast({ title: "Error", description: "Failed to accept request", variant: "destructive" });
        }
    });

    return (
        <Card className="mt-6">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <CardTitle>Friends & Connections</CardTitle>
                </div>
                <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="gap-2">
                            <UserPlus className="h-4 w-4" />
                            Add Friend
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add a Friend</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Input
                                    placeholder="Enter friend's email address"
                                    value={emailToInvite}
                                    onChange={(e) => setEmailToInvite(e.target.value)}
                                />
                                <p className="text-sm text-muted-foreground">
                                    Send a friend request using their registered email address.
                                </p>
                            </div>
                            <Button
                                className="w-full"
                                onClick={() => sendRequestMutation.mutate(emailToInvite)}
                                disabled={sendRequestMutation.isPending || !emailToInvite}
                            >
                                {sendRequestMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Send Request
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="friends">
                    <TabsList className="w-full">
                        <TabsTrigger value="friends" className="flex-1">
                            My Friends ({friends?.length || 0})
                        </TabsTrigger>
                        <TabsTrigger value="requests" className="flex-1">
                            Requests ({requests?.length || 0})
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="friends" className="mt-4 space-y-4">
                        {friendsLoading ? (
                            <div className="text-center py-4 text-muted-foreground">Loading friends...</div>
                        ) : friends?.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground border rounded-md border-dashed">
                                You haven't added any friends yet.
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {friends?.map((friend) => (
                                    <div key={friend.id} className="flex items-center justify-between p-3 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold uppercase">
                                                {/* Display initial of the OTHER person. 
                            Since we don't know which is which easily without logic, 
                            we rely on 'sender' and 'receiver' populated in backend. 
                            Wait, backend populates both? 
                            The query result includes 'sender' and 'receiver'.
                            We need to check which one is NOT me? 
                            Actually backend 'getFriends' returns rows where I am sender OR receiver.
                            But I didn't include logic in backend to normalize the "friend_user" object.
                            So frontend needs to figure out who the friend is.
                            We verify who is logged in user? 
                            We don't have user ID here easily unless passed in props or useAuth.
                            I'll use useAuth.
                        */}
                                                <FriendAvatar friend={friend} />
                                            </div>
                                            <div>
                                                {/* Similar logic for name */}
                                                <FriendName friend={friend} />
                                            </div>
                                        </div>
                                        <Badge variant="secondary">Connected</Badge>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="requests" className="mt-4 space-y-4">
                        {requestsLoading ? (
                            <div className="text-center py-4 text-muted-foreground">Loading requests...</div>
                        ) : requests?.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                No pending friend requests.
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                {requests?.map((req) => (
                                    <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="h-8 w-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                                                ?
                                            </div>
                                            <div className="text-sm">
                                                <span className="font-medium">{req.sender?.name || req.sender?.email}</span>
                                                <p className="text-xs text-muted-foreground">wants to be friends</p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => acceptRequestMutation.mutate(req.id)}
                                                disabled={acceptRequestMutation.isPending}
                                            >
                                                <Check className="h-4 w-4 mr-1" /> Accept
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

// Helpers to display friend info correct (since relation is bidirectional)
function FriendAvatar({ friend }: { friend: FriendType }) {
    const { user } = useAuth();
    const otherUser = friend.user_id === user?.id ? friend.receiver : friend.sender;
    return <span>{otherUser?.name?.charAt(0) || "?"}</span>;
}

function FriendName({ friend }: { friend: FriendType }) {
    const { user } = useAuth();
    const otherUser = friend.user_id === user?.id ? friend.receiver : friend.sender;
    return (
        <div className="text-sm">
            <p className="font-medium">{otherUser?.name || "Unknown User"}</p>
            <p className="text-xs text-muted-foreground">{otherUser?.email}</p>
        </div>
    );
}
