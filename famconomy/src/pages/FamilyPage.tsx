import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Settings, UserPlus, MoreVertical, Star, Calendar, Plus, Trash2, RotateCcw, Edit } from 'lucide-react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import {
  updateFamily,
  removeFamilyMember,
  leaveFamily,
  createFamily,
  getMyFamily,
  updateFamilyMemberRole,
  updateFamilyMemberPermissions,
} from '../api/family';
import { getRooms, getGigTemplates, createRoom, updateRoom, deleteRoom, resetRooms } from '../api/gigs';
import type { Room } from '../types/gigs';
import type { RoomTemplate } from '../types/gigs';
import { CreateRoomModal } from '../components/family/CreateRoomModal';
import { EditRoomModal } from '../components/family/EditRoomModal';
import { getRelationships } from '../api/relationships';
import type { Relationship, User } from '../types/family';
import type { Invitation } from '../types/invitations';
import { CreateFamily } from '../components/family/CreateFamily';
import { InviteMemberModal } from '../components/family/InviteMemberModal';
import { FamilySettingsModal } from '../components/family/FamilySettingsModal';
import { MemberMenu } from '../components/family/MemberMenu';
import { EditProfileModal } from '../components/family/EditProfileModal';
import { MemberProfileModal } from '../components/family/MemberProfileModal';
import { createInvitation, getPendingInvitations, acceptInvitation, declineInvitation } from '../api/invitations';
import { PendingInvitations } from '../components/family/PendingInvitations';
import { InvitationActionModal } from '../components/family/InvitationActionModal';
import { updateUser } from '../api/user';
import { createDebugLogger } from '../utils/debug';
import { useFamily } from '../hooks/useFamily';
import { useOnboardingContext } from '../hooks/useOnboardingContext';

const roleColors: Record<string, { bg: string; text: string }> = {
  parent: { bg: 'bg-primary-100', text: 'text-primary-800' },
  guardian: { bg: 'bg-secondary-100', text: 'text-secondary-800' },
  child: { bg: 'bg-accent-100', text: 'text-accent-800' },
  other: { bg: 'bg-neutral-100', text: 'text-neutral-800' }
};

export const FamilyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    family,
    families,
    activeFamilyId,
    setActiveFamilyId,
    isLoading: isFamiliesLoading,
    error: familiesError,
    refetchFamily,
  } = useFamily();
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTemplates, setRoomTemplates] = useState<RoomTemplate[]>([]);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitePrefill, setInvitePrefill] = useState<{ email: string; relationshipId: number; name?: string } | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLeaveFamilyConfirm, setShowLeaveFamilyConfirm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<User | null>(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [viewingMember, setViewingMember] = useState<User | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<Invitation[]>([]);
  const [showInvitationActionModal, setShowInvitationActionModal] = useState(false);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [roomBeingEdited, setRoomBeingEdited] = useState<Room | null>(null);
  const [showNewFamilyModal, setShowNewFamilyModal] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [isCreatingFamily, setIsCreatingFamily] = useState(false);
  const [createFamilyError, setCreateFamilyError] = useState<string | null>(null);
  const familyDebug = useMemo(() => createDebugLogger('family-page'), []);
  const error = familiesError ?? detailsError;
  const isLoading = isFamiliesLoading || isDetailsLoading;

  const onboarding = useOnboardingContext();

  // Add useSearchParams here
  const [searchParams, setSearchParams] = useSearchParams();

  const loadRelationships = useCallback(async () => {
    try {
      const data = await getRelationships();
      setRelationships(data);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to load relationships');
    }
  }, []);

  const loadRoomTemplates = useCallback(async () => {
    try {
      const templates = await getGigTemplates();
      familyDebug.log('roomTemplatesData from API', templates);

      const templatePairs = templates
        .map((gt) => (gt.roomTemplate ? [gt.roomTemplate.id, gt.roomTemplate] as const : null))
        .filter((pair): pair is readonly [number, RoomTemplate] => pair !== null);

      const uniqueTemplates = Array.from(new Map(templatePairs).values());
      setRoomTemplates(uniqueTemplates);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to load room templates');
    }
  }, [familyDebug]);

  const loadFamilyDetails = useCallback(
    async (familyId: number | null) => {
      if (!familyId) {
        setRooms([]);
        setPendingInvitations([]);
        setDetailsError(null);
        return;
      }

      try {
        setIsDetailsLoading(true);
        setDetailsError(null);
        const [invitationsData, roomsData] = await Promise.all([
          getPendingInvitations(),
          getRooms(familyId),
        ]);

        setPendingInvitations(
          invitationsData.filter((invitation: Invitation) => invitation.FamilyID === familyId)
        );
        setRooms(roomsData);
      } catch (err) {
        setDetailsError(err instanceof Error ? err.message : 'Failed to load family data');
      } finally {
        setIsDetailsLoading(false);
      }
    },
    []
  );

  const handleStartNewHousehold = useCallback(async () => {
    try {
      const placeholderName = 'New Household';
      const createdFamily = await createFamily(placeholderName);
      const refreshed = await getMyFamily();
      const newFamilyId = createdFamily?.FamilyID ?? refreshed.activeFamilyId ?? null;

      if (newFamilyId !== null) {
        setActiveFamilyId(newFamilyId, { families: refreshed.families ?? families });
        await loadFamilyDetails(newFamilyId);
      }

      if (onboarding?.resetOnboarding) {
        await onboarding.resetOnboarding();
      }

      navigate('/onboarding?new=1');
    } catch (error) {
      setDetailsError(error instanceof Error ? error.message : 'Failed to start a new household');
    }
  }, [families, loadFamilyDetails, navigate, onboarding, setActiveFamilyId]);

  useEffect(() => {
    loadRelationships();
    loadRoomTemplates();
  }, [loadRelationships, loadRoomTemplates]);

  useEffect(() => {
    loadFamilyDetails(activeFamilyId ?? null);
  }, [activeFamilyId, loadFamilyDetails]);

  useEffect(() => {
    const token = searchParams.get('token');
    familyDebug.log('FamilyPage useEffect: token from URL', token);
    if (token) {
      setInvitationToken(token);
      setShowInvitationActionModal(true);
      familyDebug.log('FamilyPage useEffect: setting invitationToken', token);
      familyDebug.log('FamilyPage useEffect: setting showInvitationActionModal', true);
      // Remove token from URL when modal is closed or action is taken
      // setSearchParams({}, { replace: true }); // intentionally disabled
    }
  }, [searchParams, setSearchParams, familyDebug]);

  const handleFamilyCreated = async () => {
    const response = await refetchFamily();
    const createdId = response?.activeFamilyId ?? response?.families?.[0]?.FamilyID ?? null;
    if (createdId !== null) {
      setActiveFamilyId(createdId, { families: response?.families ?? families });
      await loadFamilyDetails(createdId);
    }
  };

  const [showMemberMenu, setShowMemberMenu] = useState<string | number | null>(null);

  const handleFamilySelectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const value = Number(event.target.value);
      if (Number.isNaN(value)) {
        setActiveFamilyId(null);
      } else {
        setActiveFamilyId(value);
      }
    },
    [setActiveFamilyId]
  );

  const handleInvite = async (email: string, relationshipId: number) => {
    if (!family || !user) return;

    try {
      await createInvitation(family.FamilyID.toString(), email, (user as any).id ?? (user as any).UserID, relationshipId);
      setShowInviteModal(false);
      setInvitePrefill(null);
      await loadFamilyDetails(family.FamilyID);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to send invitation');
    }
  };

  const handleSaveSettings = async (familyName: string, familyMantra: string, _unused?: string[], rewardMode?: string) => {
    if (!family) return;
    try {
      await updateFamily(
        family.FamilyID.toString(),
        familyName,
        familyMantra,
        family.FamilyValues ?? [],
        rewardMode
      );
      setShowSettingsModal(false);
      await refetchFamily();
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to save settings');
    }
  };

  const handleUpdateProfile = async ({
    userData,
    relationshipId,
    permissions,
  }: {
    userData: Partial<User>;
    relationshipId: number | null;
    permissions: string[];
  }) => {
    if (!selectedMember) return;

    try {
      await updateUser(selectedMember.UserID, userData);
      if (family && relationshipId !== null && relationshipId !== selectedMember.RelationshipID) {
        await updateFamilyMemberRole(String(family.FamilyID), selectedMember.UserID, relationshipId);
      }
      if (family) {
        await updateFamilyMemberPermissions(String(family.FamilyID), selectedMember.UserID, permissions);
      }
      setShowEditProfileModal(false);
      await refetchFamily();
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to update profile');
    }
  };

  const handleRemoveMember = async (memberId: string | number) => {
    if (!family) return;

    try {
      await removeFamilyMember(family.FamilyID.toString(), String(memberId));
      await refetchFamily();
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleLeaveFamily = async () => {
    if (!family || !user) return;

    try {
      await leaveFamily();
      setShowLeaveFamilyConfirm(false);
      await refetchFamily();
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to leave family');
    }
  };

  const handleAcceptInvitation = async (token: string) => {
    try {
      await acceptInvitation(token);
      await loadFamilyDetails(family?.FamilyID ?? activeFamilyId ?? null);
      await refetchFamily();
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to accept invitation');
    }
  };

  const handleDeclineInvitation = async (token: string) => {
    try {
      await declineInvitation(token);
      await loadFamilyDetails(family?.FamilyID ?? activeFamilyId ?? null);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to decline invitation');
    }
  };

  const handleCreateRoom = async (roomName: string, roomTemplateId: number) => {
    if (!family) return;

    try {
      await createRoom(family.FamilyID, roomName, roomTemplateId);
      setShowCreateRoomModal(false);
      await loadFamilyDetails(family.FamilyID);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to create room');
    }
  };

  const handleDeleteRoom = async (roomId: number) => {
    if (!family) return;
    const confirmed = window.confirm('Remove this room? Any gigs assigned to it will also be cleared.');
    if (!confirmed) return;
    try {
      await deleteRoom(roomId);
      await loadFamilyDetails(family.FamilyID);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to delete room');
    }
  };

  const handleRenameRoom = async (roomId: number, newName: string) => {
    if (!family) return;
    try {
      await updateRoom(roomId, { name: newName });
      await loadFamilyDetails(family.FamilyID);
      setRoomBeingEdited(null);
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to rename room');
    }
  };

  const handleResetFloorPlan = async () => {
    if (!family) return;
    const confirmed = window.confirm('Reset the entire floor plan? This removes every room and its assignments.');
    if (!confirmed) return;
    try {
      await resetRooms(family.FamilyID);
      await loadFamilyDetails(family.FamilyID);
      if (onboarding?.resetOnboarding) {
        await onboarding.resetOnboarding();
      }
      sessionStorage.setItem('onboarding-focus', 'rooms');
      navigate('/onboarding?focus=rooms');
    } catch (err) {
      setDetailsError(err instanceof Error ? err.message : 'Failed to reset floor plan');
    }
  };

  const getRoleName = (relationshipId?: number) => {
    if (!relationshipId) return 'other';
    const relationship = relationships.find(r => r.RelationshipID === relationshipId);
    return relationship ? relationship.RelationshipName.toLowerCase() : 'other';
  };

  if (isLoading) {
    return <div>Loading family data...</div>;
  }

  if (error) {
    return <div className="text-error-500">Error: {error}</div>;
  }

  const PLACEHOLDER_EMAIL_DOMAIN = 'famc.local';
  const isPlaceholderMember = (email?: string | null) => !email || email.toLowerCase().endsWith(`@${PLACEHOLDER_EMAIL_DOMAIN}`);

  let placeholderCalloutAttached = false;

  return (
    <div className="space-y-6">
      {/* Render CreateFamily if no family and no invitation token is present */}
      {!family && !invitationToken && (
        <CreateFamily onFamilyCreated={handleFamilyCreated} />
      )}

      {/* Render main family content only if family exists */}
      {family && (
        <>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div className="flex flex-col gap-2">
              <span className="text-sm text-neutral-500 dark:text-neutral-400">Active household</span>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={activeFamilyId ?? ''}
                  onChange={handleFamilySelectChange}
                  className="px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {families.map(optionFamily => (
                    <option key={optionFamily.FamilyID} value={optionFamily.FamilyID}>
                      {optionFamily.FamilyName}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleStartNewHousehold}
                  className="px-3 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                >
                  Start New Household
                </button>
              </div>
            </div>
            {families.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {families
                  .filter(otherFamily => otherFamily.FamilyID !== activeFamilyId)
                  .map(otherFamily => (
                    <button
                      key={otherFamily.FamilyID}
                      onClick={() => setActiveFamilyId(otherFamily.FamilyID)}
                      className="px-3 py-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                    >
                      Switch to {otherFamily.FamilyName}
                    </button>
                  ))}
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-1">{family.FamilyName}</h1>
              <p className="text-neutral-500 dark:text-neutral-400">Manage your family circle and permissions</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/family/values"
                className="flex items-center px-3 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Star size={18} className="mr-2" />
                <span>Family Values</span>
              </Link>
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center px-3 py-2 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <Settings size={18} className="mr-2" />
                <span>Settings</span>
              </button>

              <button
                onClick={() => {
                  setInvitePrefill(null);
                  setShowInviteModal(true);
                }}
                className="flex items-center px-3 py-2 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400 transition-colors"
              >
                <UserPlus size={18} className="mr-2" />
                <span>Invite Member</span>
              </button>
            </div>
          </div>

          {/* Family Members Grid */}
          <div id="family-members-panel" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {family.members.map((member) => {
              const roleName = getRoleName(member.RelationshipID);
              const roleStyle = roleColors[roleName] || roleColors.other;
              const isPlaceholder = isPlaceholderMember(member.Email);
              const calloutId = isPlaceholder && !placeholderCalloutAttached ? 'placeholder-members-callout' : undefined;
              if (isPlaceholder && !placeholderCalloutAttached) {
                placeholderCalloutAttached = true;
              }
              return (
                <div
                  key={member.UserID}
                  className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card hover:shadow-card-hover transition-all p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center">
                      <div className="relative">
                        <img
                          src={member.ProfilePhotoUrl || 'https://i.pravatar.cc/100'}
                          alt={`${member.FirstName} ${member.LastName}`}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      </div>
                      <div className="ml-3">
                        <h3 className="font-medium text-neutral-900 dark:text-white">{`${member.FirstName} ${member.LastName}`}</h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${roleStyle.bg} ${roleStyle.text}`}>
                          {roleName.charAt(0).toUpperCase() + roleName.slice(1)}
                        </span>
                        {isPlaceholder && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                            Placeholder
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setShowMemberMenu(prev => (prev === member.UserID ? null : member.UserID))}
                        className="text-neutral-400 hover:text-neutral-600 dark:text-neutral-500 dark:hover:text-neutral-300"
                        aria-label="Open member actions"
                      >
                        <MoreVertical size={18} />
                      </button>
                      <AnimatePresence>
                        {showMemberMenu === member.UserID && (
                          <MemberMenu
                            isOpen={showMemberMenu === member.UserID}
                            onClose={() => setShowMemberMenu(null)}
                            onView={() => setViewingMember(member)}
                            onEdit={() => {
                              setSelectedMember(member);
                              setShowEditProfileModal(true);
                            }}
                            onRemove={() => handleRemoveMember(member.UserID)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center text-neutral-500 dark:text-neutral-400">
                      <Calendar size={16} className="mr-2" />
                      <span>Joined {new Date(member.CreatedDate).toLocaleDateString()}</span>
                    </div>
                    {member.BirthDate && (
                      <div className="flex items-center text-neutral-500 dark:text-neutral-400">
                        <Star size={16} className="mr-2" />
                        <span>Born {new Date(member.BirthDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {isPlaceholder && (
                      <div
                        id={calloutId}
                        className="rounded-xl border border-dashed border-primary-300 dark:border-primary-700 bg-primary-50/60 dark:bg-primary-900/20 px-3 py-3 text-sm text-primary-700 dark:text-primary-200"
                      >
                        <p className="mb-2">
                          This profile was created during onboarding. Send an email invite to let {member.FirstName} join FamConomy.
                        </p>
                        <button
                          onClick={() => {
                              setInvitePrefill({
                                email: '',
                                relationshipId: member.RelationshipID ?? relationships[0]?.RelationshipID ?? 0,
                                name: `${member.FirstName} ${member.LastName}`.trim(),
                              });
                            setShowInviteModal(true);
                          }}
                          className="inline-flex items-center px-3 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400"
                        >
                          Send Invitation
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Room Management Section */}
          <div className="space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Rooms</h2>
                {rooms.length > 0 && (
                  <button
                    onClick={handleResetFloorPlan}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl border border-neutral-200 dark:border-neutral-700 text-sm text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <RotateCcw size={16} />
                    Reset Floor Plan
                  </button>
                )}
              </div>
              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="flex items-center px-3 py-2 rounded-2xl bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400 transition-colors"
              >
                <Plus size={18} className="mr-2" />
                <span>Add Room</span>
              </button>
            </div>
            {rooms.length === 0 ? (
              <p className="text-neutral-500 dark:text-neutral-400">No rooms configured yet. Add your first room!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {rooms.map((room) => (
                  <div key={room.id} className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-medium text-neutral-900 dark:text-white">{room.name}</h3>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">{room.roomTemplateId ? 'Based on template' : 'Custom room'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRoomBeingEdited(room)}
                          className="text-neutral-400 hover:text-primary-500 transition-colors"
                          aria-label={`Rename ${room.name}`}
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-neutral-400 hover:text-red-500 transition-colors"
                          aria-label={`Delete ${room.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    {room.roomTemplate?.description && (
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-3">{room.roomTemplate.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <PendingInvitations
            invitations={pendingInvitations}
            onAccept={handleAcceptInvitation}
            onDecline={handleDeclineInvitation}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
          />

          <InviteMemberModal
            isOpen={showInviteModal}
            onClose={() => {
              setShowInviteModal(false);
              setInvitePrefill(null);
            }}
            onInvite={handleInvite}
            relationships={relationships}
            initialEmail={invitePrefill?.email}
            initialRelationshipId={invitePrefill?.relationshipId}
            inviteeName={invitePrefill?.name}
          />

          {family && (
            <FamilySettingsModal
              isOpen={showSettingsModal}
              onClose={() => setShowSettingsModal(false)}
              onSave={handleSaveSettings}
              onLeaveFamily={() => setShowLeaveFamilyConfirm(true)}
              onCreateNewFamily={() => {
                setShowSettingsModal(false);
                setNewFamilyName('');
                setCreateFamilyError(null);
                setShowNewFamilyModal(true);
              }}
              family={family}
            />
          )}

          {selectedMember && (
            <EditProfileModal
              isOpen={showEditProfileModal}
              onClose={() => setShowEditProfileModal(false)}
              onSave={handleUpdateProfile}
              user={selectedMember}
              relationships={relationships}
              availablePermissions={[]}
              currentPermissions={[]}
            />
          )}

          {viewingMember && (
            <MemberProfileModal
              isOpen={Boolean(viewingMember)}
              member={viewingMember}
              relationshipName={getRoleName(viewingMember.RelationshipID)}
              onClose={() => setViewingMember(null)}
              familyId={family?.FamilyID ?? null}
              currentUserId={user?.UserID ?? null}
            />
          )}

          {roomBeingEdited && (
            <EditRoomModal
              isOpen={Boolean(roomBeingEdited)}
              initialName={roomBeingEdited.name}
              onClose={() => setRoomBeingEdited(null)}
              onSave={(newName) => handleRenameRoom(roomBeingEdited.id, newName)}
            />
          )}

          <AnimatePresence>
            {showLeaveFamilyConfirm && (
              <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg w-full max-w-md"
                >
                  <div className="p-6 text-center">
                    <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-4">
                      Are you sure you want to leave this family?
                    </h3>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-6">
                      You will lose access to all family data.
                    </p>
                    <div className="flex justify-center gap-4">
                      <button
                        onClick={() => setShowLeaveFamilyConfirm(false)}
                        className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleLeaveFamily}
                        className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl"
                      >
                        Leave Family
                      </button>
                    </div>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          <CreateRoomModal
            isOpen={showCreateRoomModal}
            onClose={() => setShowCreateRoomModal(false)}
            onConfirm={handleCreateRoom}
            roomTemplates={roomTemplates}
          />
        </>
      )}

      {invitationToken && (
        <InvitationActionModal
          isOpen={showInvitationActionModal}
          onClose={() => setShowInvitationActionModal(false)}
          token={invitationToken}
          onAccept={handleAcceptInvitation}
          onDecline={handleDeclineInvitation}
          setSearchParams={setSearchParams}
          currentUser={user} // Pass the current user object
        />
      )}

      <AnimatePresence>
        {showNewFamilyModal && (
          <div className="fixed inset-0 bg-neutral-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-neutral-800 rounded-2xl shadow-lg w-full max-w-md"
            >
              <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-medium text-neutral-900 dark:text-white">Create a New Household</h3>
                <button
                  onClick={() => setShowNewFamilyModal(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  &times;
                </button>
              </div>
              <div className="p-4 space-y-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-300">
                  Give your new household a name. You can invite members or run the onboarding assistant once it’s created.
                </p>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Household Name
                  </label>
                  <input
                    type="text"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    placeholder="e.g., The Andersons"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                    disabled={isCreatingFamily}
                  />
                </div>
                {createFamilyError && (
                  <p className="text-sm text-error-500">{createFamilyError}</p>
                )}
              </div>
              <div className="flex justify-end gap-3 p-4 border-t border-neutral-200 dark:border-neutral-700">
                <button
                  onClick={() => setShowNewFamilyModal(false)}
                  className="px-4 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-xl"
                  disabled={isCreatingFamily}
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    if (!newFamilyName.trim()) {
                      setCreateFamilyError('Household name is required.');
                      return;
                    }
                    try {
                      setIsCreatingFamily(true);
                      setCreateFamilyError(null);
                      const createdFamily = await createFamily(newFamilyName.trim());
                      const response = await refetchFamily();
                      setActiveFamilyId(createdFamily.FamilyID, { families: response?.families ?? families });
                      await loadFamilyDetails(createdFamily.FamilyID);
                      setShowNewFamilyModal(false);
                      setNewFamilyName('');
                      setIsCreatingFamily(false);
                      const startOnboarding = window.confirm('Household created! Would you like to run the onboarding assistant now?');
                      if (startOnboarding) {
                        navigate('/onboarding');
                      }
                    } catch (err) {
                      setCreateFamilyError(err instanceof Error ? err.message : 'Failed to create household');
                      setIsCreatingFamily(false);
                    }
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 dark:hover:bg-primary-400 rounded-xl disabled:opacity-60"
                  disabled={isCreatingFamily}
                >
                  {isCreatingFamily ? 'Creating…' : 'Create Household'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
