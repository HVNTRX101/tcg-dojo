import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '../services/notification.service';
import { useAuth, useUpdateProfile, useChangePassword } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { Switch } from '../components/ui/switch';
import { Separator } from '../components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { toast } from 'sonner';
import { User, Bell, Lock, Shield } from 'lucide-react';
import { SentryTestButton } from '../components/SentryTestButton';

export default function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Profile state
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Update profile mutation
  const updateProfileMutation = useUpdateProfile();

  // Change password mutation
  const changePasswordMutation = useChangePassword();

  // Fetch notification preferences
  const { data: notificationPreferences, isLoading: preferencesLoading } = useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationService.getPreferences(),
  });

  // Update notification preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: any) => notificationService.updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Notification preferences updated');
    },
    onError: () => {
      toast.error('Failed to update preferences');
    },
  });

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate(profileData, {
      onSuccess: () => {
        toast.success('Profile updated successfully');
      },
      onError: () => {
        toast.error('Failed to update profile');
      },
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    changePasswordMutation.mutate(
      {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      },
      {
        onSuccess: () => {
          toast.success('Password changed successfully');
          setPasswordData({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
        },
        onError: () => {
          toast.error('Failed to change password');
        },
      }
    );
  };

  const handlePreferenceChange = (key: string, value: boolean) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your profile details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={user?.avatarUrl} />
                  <AvatarFallback className="text-2xl">
                    {user?.name?.charAt(0).toUpperCase() || '?'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                  <p className="text-sm text-gray-500 mt-1">JPG, PNG or GIF. Max size 2MB</p>
                </div>
              </div>

              <Separator />

              {/* Profile Form */}
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={profileData.name}
                    onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                    placeholder="Enter your full name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>

                <Button type="submit" disabled={updateProfileMutation.isPending}>
                  {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" id="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>Manage how you receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {preferencesLoading ? (
                <div className="text-center py-8 text-gray-500">Loading preferences...</div>
              ) : (
                <>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <Switch
                        checked={notificationPreferences?.emailNotifications ?? false}
                        onCheckedChange={checked =>
                          handlePreferenceChange('emailNotifications', checked)
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Push Notifications</Label>
                        <p className="text-sm text-gray-500">
                          Receive push notifications in browser
                        </p>
                      </div>
                      <Switch
                        checked={notificationPreferences?.pushNotifications ?? false}
                        onCheckedChange={checked =>
                          handlePreferenceChange('pushNotifications', checked)
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Order Updates</Label>
                        <p className="text-sm text-gray-500">
                          Get notified about order status changes
                        </p>
                      </div>
                      <Switch
                        checked={notificationPreferences?.orderUpdates ?? false}
                        onCheckedChange={checked => handlePreferenceChange('orderUpdates', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Price Alerts</Label>
                        <p className="text-sm text-gray-500">Receive alerts for price changes</p>
                      </div>
                      <Switch
                        checked={notificationPreferences?.priceAlerts ?? false}
                        onCheckedChange={checked => handlePreferenceChange('priceAlerts', checked)}
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Product Messages</Label>
                        <p className="text-sm text-gray-500">Get notified of new messages</p>
                      </div>
                      <Switch
                        checked={notificationPreferences?.productMessages ?? false}
                        onCheckedChange={checked =>
                          handlePreferenceChange('productMessages', checked)
                        }
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Promotions</Label>
                        <p className="text-sm text-gray-500">
                          Receive promotional emails and offers
                        </p>
                      </div>
                      <Switch
                        checked={notificationPreferences?.promotions ?? false}
                        onCheckedChange={checked => handlePreferenceChange('promotions', checked)}
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your password and security preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={e =>
                      setPasswordData({ ...passwordData, currentPassword: e.target.value })
                    }
                    placeholder="Enter current password"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={e =>
                      setPasswordData({ ...passwordData, newPassword: e.target.value })
                    }
                    placeholder="Enter new password"
                  />
                  <p className="text-sm text-gray-500">Must be at least 8 characters</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={e =>
                      setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                    }
                    placeholder="Confirm new password"
                  />
                </div>

                <Button type="submit" disabled={changePasswordMutation.isPending}>
                  <Shield className="h-4 w-4 mr-2" />
                  {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
                </Button>
              </form>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-semibold">Two-Factor Authentication</h3>
                <p className="text-sm text-gray-600">
                  Add an extra layer of security to your account by enabling two-factor
                  authentication.
                </p>
                <Button variant="outline">Enable 2FA</Button>
              </div>

              {/* Developer Tools - Only visible in development */}
              {import.meta.env.MODE === 'development' && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <h3 className="font-semibold">Developer Tools</h3>
                    <SentryTestButton />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
