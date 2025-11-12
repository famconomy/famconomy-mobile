import React, { useMemo, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { spacing, lightTheme, darkTheme, borderRadius, fontSize } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { useAuth } from '../../hooks/useAuth';
import { useFamily } from '../../hooks/useFamily';
import { useDashboard } from '../../hooks/useDashboard';
import { useRooms } from '../../hooks/useRooms';
import { Text } from '../../components/ui/Text';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Alert as UiAlert } from '../../components/ui/Alert';
import { Toast } from '../../components/ui/Toast';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { PendingInvitations } from '../../components/family/PendingInvitations';
import { InviteMemberModal } from '../../components/family/InviteMemberModal';
import { SwitchFamilyModal } from '../../components/family/SwitchFamilyModal';
import {
  removeMember as removeFamilyMember,
  updateMemberRole,
} from '../../api/family';
import apiClient from '../../api/apiClient';

const ROLE_OPTIONS: Array<'parent' | 'guardian' | 'child'> = ['parent', 'guardian', 'child'];

const FamilyScreen: React.FC = () => {
  const { theme } = useAppStore();
  const { user } = useAuth();
  const { family, families, activeFamilyId, setActiveFamilyId, refetchFamily } = useFamily();
  const { refetch: refetchDashboard } = useDashboard({ familyId: family?.id });

  const isDark = theme === 'dark';
  const themeColors = isDark ? darkTheme : lightTheme;

  const members = family?.members ?? [];
  const [showInvite, setShowInvite] = useState(false);
  const [showSwitch, setShowSwitch] = useState(false);
  const [roleModalMember, setRoleModalMember] = useState<{
    id: string;
    name: string;
    role: string;
  } | null>(null);
  const [isProcessingRole, setIsProcessingRole] = useState(false);
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const { rooms, isLoading: roomsLoading, error: roomsError, addRoom, removeRoom } = useRooms({
    familyId: typeof family?.id === 'number' ? family.id : family?.id ? Number(family.id) : null,
  });

  const canManage = useMemo(
    () => user?.role === 'parent' || user?.role === 'guardian' || user?.role === 'admin',
    [user?.role],
  );

  const handleLeaveFamily = async () => {
    try {
      await apiClient.delete('/family/leave');
      await refetchFamily();
      await refetchDashboard();
      setToast({ message: 'You left the family', type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to leave family.';
      setToast({ message, type: 'error' });
    }
  };

  const confirmLeave = () => {
    Alert.alert(
      'Leave family?',
      'You will be removed from this family. You can rejoin via a new invitation.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: handleLeaveFamily },
      ],
    );
  };

  const confirmRemoveMember = (memberName: string, memberId: string) => {
    Alert.alert(
      'Remove member?',
      `Remove ${memberName} from this family?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!family?.id) return;
            try {
              await removeFamilyMember(String(family.id), memberId);
              await refetchFamily();
              await refetchDashboard();
              setToast({ message: 'Member removed', type: 'success' });
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unable to remove member.';
              setToast({ message, type: 'error' });
            }
          },
        },
      ],
    );
  };

  const handleChangeRole = async (role: 'parent' | 'guardian' | 'child') => {
    if (!family?.id || !roleModalMember) return;
    setIsProcessingRole(true);
    try {
      await updateMemberRole(String(family.id), roleModalMember.id, { role });
      await refetchFamily();
      setToast({ message: 'Member role updated', type: 'success' });
      setRoleModalMember(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to update member role.';
      setToast({ message, type: 'error' });
    } finally {
      setIsProcessingRole(false);
    }
  };

  const handleAddRoom = async () => {
    if (!family?.id) {
      setToast({ message: 'Join a family to manage rooms.', type: 'info' });
      return;
    }
    if (!newRoomName.trim()) {
      setToast({ message: 'Enter a room name first.', type: 'info' });
      return;
    }
    try {
      await addRoom(newRoomName.trim());
      setRoomModalOpen(false);
      setNewRoomName('');
      setToast({ message: 'Room added', type: 'success' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to create room.';
      setToast({ message, type: 'error' });
    }
  };

  const confirmRemoveRoom = (roomId: number, name: string) => {
    Alert.alert(
      'Remove room?',
      `This will remove ${name} and any linked chores.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeRoom(roomId);
              setToast({ message: 'Room removed', type: 'success' });
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unable to remove room.';
              setToast({ message, type: 'error' });
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {toast && <Toast message={toast.message} type={toast.type} onHide={() => setToast(null)} />}

      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
        <View>
          <Text variant="h2" isDark={isDark}>Family</Text>
          {family && (
            <Text variant="body" color="textSecondary" isDark={isDark}>
              {family.name}
            </Text>
          )}
        </View>
        {families.length > 1 && (
          <TouchableOpacity
            onPress={() => setShowSwitch(true)}
            style={{ borderColor: themeColors.border, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
          >
            <Text isDark={isDark} style={{ fontWeight: '600' }}>Switch</Text>
          </TouchableOpacity>
        )}
      </View>

      <Card isDark={isDark} style={styles.infoCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
          <Text variant="h4" isDark={isDark}>Members</Text>
          {family && canManage && (
            <TouchableOpacity
              onPress={() => setShowInvite(true)}
              style={{ backgroundColor: themeColors.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600' }}>Invite</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text variant="h3" isDark={isDark} style={styles.count}>{members.length}</Text>
      </Card>

      {members.length > 0 ? (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <Card isDark={isDark} style={styles.memberCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <Text variant="h4" isDark={isDark}>
                    {item.firstName || item.lastName ? `${item.firstName ?? ''} ${item.lastName ?? ''}`.trim() : item.email}
                  </Text>
                  <Text variant="caption" color="textSecondary" isDark={isDark}>
                    {item.role}
                  </Text>
                </View>
                {canManage && (
                  <View style={styles.memberActions}>
                    <TouchableOpacity
                      onPress={() =>
                        setRoleModalMember({
                          id: item.id,
                          name: item.firstName || item.email || 'Family member',
                          role: item.role,
                        })
                      }
                      style={[styles.memberActionButton, { borderColor: themeColors.border }]}
                    >
                      <Text isDark={isDark} style={styles.memberActionText}>Change role</Text>
                    </TouchableOpacity>
                    {user?.id !== item.id && (
                      <TouchableOpacity
                        onPress={() => confirmRemoveMember(item.firstName || item.email || 'this user', item.id)}
                        style={[styles.memberActionButton, { borderColor: themeColors.border }]}
                      >
                        <Text isDark={isDark} style={styles.memberActionText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </Card>
          )}
        />
      ) : (
        <Card isDark={isDark} style={styles.emptyState}>
          <Text variant="body" color="textSecondary" isDark={isDark}>
            No family members yet
          </Text>
        </Card>
      )}

      <View style={{ marginTop: spacing[4] }}>
        <Text variant="h4" isDark={isDark} style={{ marginBottom: spacing[2] }}>Pending invitations</Text>
        <PendingInvitations
          isDark={isDark}
          onChanged={async () => {
            await refetchFamily();
            await refetchDashboard();
          }}
        />
      </View>

      <View style={{ marginTop: spacing[4] }}>
        <Text variant="h4" isDark={isDark} style={{ marginBottom: spacing[2] }}>Household rooms</Text>
        {roomsError && (
          <UiAlert
            type="warning"
            title="Rooms unavailable"
            message={roomsError}
            isDark={isDark}
            style={{ marginBottom: spacing[2] }}
          />
        )}
        {roomsLoading ? (
          <LoadingSpinner isDark={isDark} message="Loading rooms…" />
        ) : rooms.length === 0 ? (
          <Card isDark={isDark} style={styles.emptyState}>
            <Text variant="body" color="textSecondary" isDark={isDark}>
              No rooms have been added yet.
            </Text>
          </Card>
        ) : (
          rooms.map((room) => (
            <Card key={room.id} isDark={isDark} style={styles.roomCard}>
              <View style={styles.roomRow}>
                <View>
                  <Text variant="h4" isDark={isDark} weight="bold">
                    {room.name}
                  </Text>
                  {room.roomTemplate?.name && (
                    <Text variant="caption" color="textSecondary" isDark={isDark}>
                      Template: {room.roomTemplate.name}
                    </Text>
                  )}
                </View>
                {canManage && (
                  <TouchableOpacity
                    onPress={() => confirmRemoveRoom(room.id, room.name)}
                    style={[styles.memberActionButton, { borderColor: themeColors.border }]}
                  >
                    <Text isDark={isDark} style={styles.memberActionText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </Card>
          ))
        )}
        {canManage && (
          <Button
            title="Add room"
            onPress={() => setRoomModalOpen(true)}
            isDark={isDark}
            style={{ marginTop: spacing[3] }}
          />
        )}
      </View>

      <View style={{ marginTop: spacing[4], paddingHorizontal: spacing[4] }}>
        <TouchableOpacity
          onPress={confirmLeave}
          style={{ alignSelf: 'flex-start', borderColor: themeColors.error, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 }}
        >
          <Text color="error" isDark={isDark} style={{ fontWeight: '600' }}>Leave family</Text>
        </TouchableOpacity>
      </View>

      <View style={{ height: spacing[8] }} />

      <InviteMemberModal
        visible={showInvite}
        onClose={() => setShowInvite(false)}
        familyId={family?.id || 0}
        isDark={isDark}
        onInvited={async () => {
          await refetchFamily();
          await refetchDashboard();
        }}
      />
      <SwitchFamilyModal
        visible={showSwitch}
        onClose={() => setShowSwitch(false)}
        families={families}
        activeId={activeFamilyId}
        isDark={isDark}
        onSelect={async (id) => {
          setActiveFamilyId(id);
          await refetchDashboard();
        }}
      />

      <Modal
        visible={Boolean(roleModalMember)}
        animationType="slide"
        transparent
        onRequestClose={() => setRoleModalMember(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <Text variant="h3" isDark={isDark} weight="bold" style={{ marginBottom: spacing[3] }}>
              Update role
            </Text>
            <Text variant="body" color="textSecondary" isDark={isDark} style={{ marginBottom: spacing[3] }}>
              Assign a new role for {roleModalMember?.name}.
            </Text>
            {ROLE_OPTIONS.map((roleOption) => {
              const isActive = roleModalMember?.role === roleOption;
              return (
                <TouchableOpacity
                  key={roleOption}
                  style={[
                    styles.roleOption,
                    {
                      backgroundColor: isActive ? themeColors.primaryLight : themeColors.surfaceVariant,
                      borderColor: isActive ? themeColors.primary : themeColors.border,
                    },
                  ]}
                  onPress={() => handleChangeRole(roleOption)}
                  disabled={isProcessingRole}
                >
                  <Text
                    variant="body"
                    style={{ color: isActive ? themeColors.primary : themeColors.textSecondary }}
                  >
                    {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <Button
              title="Close"
              variant="outline"
              onPress={() => setRoleModalMember(null)}
              style={{ marginTop: spacing[4] }}
              isDark={isDark}
              disabled={isProcessingRole}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={roomModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRoomModalOpen(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.surface }]}>
            <Text variant="h3" isDark={isDark} weight="bold" style={{ marginBottom: spacing[3] }}>
              Add room
            </Text>
            <Input
              label="Room name"
              value={newRoomName}
              onChangeText={setNewRoomName}
              isDark={isDark}
              placeholder="Kitchen, Living Room..."
            />
            <View style={styles.modalButtons}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => {
                  setRoomModalOpen(false);
                  setNewRoomName('');
                }}
                isDark={isDark}
              />
              <Button
                title="Add"
                onPress={handleAddRoom}
                isDark={isDark}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing[4],
  },
  header: {
    marginBottom: spacing[4],
  },
  infoCard: {
    marginBottom: spacing[4],
    alignItems: 'center',
  },
  count: {
    marginTop: spacing[2],
  },
  memberCard: {
    marginBottom: spacing[3],
  },
  memberActions: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  memberActionButton: {
    borderWidth: 1,
    borderRadius: borderRadius.base,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
  },
  memberActionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  emptyState: {
    padding: spacing[6],
    alignItems: 'center',
  },
  roomCard: {
    marginBottom: spacing[2],
  },
  roomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: spacing[4],
  },
  modalContent: {
    borderRadius: borderRadius.lg,
    padding: spacing[4],
  },
  roleOption: {
    borderWidth: 1,
    borderRadius: borderRadius.base,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    marginBottom: spacing[2],
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing[2],
    marginTop: spacing[3],
  },
});

export default FamilyScreen;
