import React, { useEffect, useMemo, useState } from 'react';
import { X, Calendar, Mail, Phone, Share2, Copy, Edit3 } from 'lucide-react';
import { toast } from 'react-toastify';
import type { User } from '../../types/family';
import { fetchMemberProfile, generateProfileShareLink, revokeProfileShareLink, upsertMemberProfile, MemberCareProfile, ProfileShareResponse } from '../../api/memberProfiles';

interface MemberProfileModalProps {
  member: User;
  relationshipName?: string;
  isOpen: boolean;
  onClose: () => void;
  familyId: number | null;
  currentUserId?: string | null;
}

const arrayToCommaString = (values?: string[]) => (values && values.length ? values.join(', ') : '');
const commaStringToArray = (value: string) => value.split(',').map(entry => entry.trim()).filter(entry => entry.length > 0);

const clothingRecordToLines = (record: Record<string, unknown>) => {
  return Object.entries(record).map(([key, value]) => key + ': ' + String(value));
};

const linesToClothingRecord = (lines: string) => {
  const output: Record<string, string> = {};
  lines.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const separator = trimmed.indexOf(':');
    if (separator === -1) {
      output[trimmed] = '';
    } else {
      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();
      if (key) output[key] = value;
    }
  });
  return output;
};

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({ member, relationshipName, isOpen, onClose, familyId, currentUserId }) => {
  void currentUserId;
  const [careProfile, setCareProfile] = useState<MemberCareProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [shareLink, setShareLink] = useState<ProfileShareResponse | null>(null);
  const [editingCare, setEditingCare] = useState(false);

  const [sizesInput, setSizesInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [foodsInput, setFoodsInput] = useState('');
  const [interestsInput, setInterestsInput] = useState('');
  const [allergiesInput, setAllergiesInput] = useState('');
  const [brandsInput, setBrandsInput] = useState('');
  const [notesInput, setNotesInput] = useState('');
  const [wishlistSummaryInput, setWishlistSummaryInput] = useState('');
  const [visibilityInput, setVisibilityInput] = useState('FAMILY');

  const firstName = member.FirstName || '';
  const lastName = member.LastName || '';
  const fullName = (firstName + ' ' + lastName).trim() || member.Email || 'Household Member';
  const joined = member.CreatedDate ? new Date(member.CreatedDate).toLocaleDateString() : undefined;
  const roleLabel = relationshipName ? relationshipName.charAt(0).toUpperCase() + relationshipName.slice(1) : 'Member';

  const resetCareForm = (profile: MemberCareProfile | null) => {
    setSizesInput(profile ? clothingRecordToLines(profile.clothingSizes || {}).join('\n') : '');
    setColorsInput(profile ? arrayToCommaString(profile.favoriteColors || []) : '');
    setFoodsInput(profile ? arrayToCommaString(profile.favoriteFoods || []) : '');
    setInterestsInput(profile ? arrayToCommaString(profile.interests || []) : '');
    setAllergiesInput(profile ? arrayToCommaString(profile.allergies || []) : '');
    setBrandsInput(profile ? arrayToCommaString(profile.favoriteBrands || []) : '');
    setNotesInput(profile ? profile.notes || '' : '');
    setWishlistSummaryInput(profile ? profile.wishlistSummary || '' : '');
    setVisibilityInput(profile ? profile.Visibility : 'FAMILY');
  };

  useEffect(() => {
    if (!isOpen || !familyId) {
      return;
    }
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        setProfileError(null);
        const response = await fetchMemberProfile(familyId, member.UserID);
        setCareProfile(response.profile);
        resetCareForm(response.profile);
        setShareLink(null);
      } catch (error) {
        setProfileError(error instanceof Error ? error.message : 'Unable to load care details');
      } finally {
        setProfileLoading(false);
      }
    };
    loadProfile();
  }, [familyId, isOpen, member.UserID]);

  useEffect(() => {
    if (!isOpen) {
      setEditingCare(false);
    }
  }, [isOpen]);

  const handleGenerateShareLink = async () => {
    if (!familyId) return;
    try {
      const response = await generateProfileShareLink(familyId, member.UserID);
      setShareLink(response);
      await navigator.clipboard.writeText(response.shareUrl);
      toast.success('Share link copied to clipboard');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to generate share link');
    }
  };

  const handleRevokeShareLink = async () => {
    if (!familyId) return;
    try {
      await revokeProfileShareLink(familyId, member.UserID);
      setShareLink(null);
      toast.info('Share link revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to revoke share link');
    }
  };

  const handleSaveCareProfile = async () => {
    if (!familyId) return;
    try {
      const payload = {
        clothingSizes: sizesInput.trim() ? linesToClothingRecord(sizesInput) : {},
        favoriteColors: commaStringToArray(colorsInput),
        favoriteFoods: commaStringToArray(foodsInput),
        interests: commaStringToArray(interestsInput),
        allergies: commaStringToArray(allergiesInput),
        favoriteBrands: commaStringToArray(brandsInput),
        notes: notesInput.trim() || null,
        wishlistSummary: wishlistSummaryInput.trim() || null,
        visibility: visibilityInput as any,
      };
      const response = await upsertMemberProfile(familyId, member.UserID, payload);
      setCareProfile(response.profile);
      resetCareForm(response.profile);
      setEditingCare(false);
      toast.success('Care profile updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update care profile');
    }
  };

  const renderCareSection = () => {
    if (profileLoading) {
      return (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">
          Loading favorites and sizes...
        </div>
      );
    }
    if (profileError) {
      return (
        <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-900/30 dark:text-error-200">
          {profileError}
        </div>
      );
    }
    if (!careProfile) {
      return (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900/30 dark:text-neutral-300">
          No care details captured yet. Add sizes, favorites, and notes so gifting is easy.
        </div>
      );
    }

    const clothingEntries = Object.entries(careProfile.clothingSizes || {});

    return (
      <div className="space-y-4">
        {clothingEntries.length ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Clothing sizes</h3>
            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {clothingEntries.map(([key, value]) => (
                <div key={key} className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  <span className="font-medium">{key}: </span>
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {renderChipList('Favorite colors', careProfile.favoriteColors || [])}
        {renderChipList('Favorite foods', careProfile.favoriteFoods || [])}
        {renderChipList('Interests', careProfile.interests || [])}
        {renderChipList('Allergies', careProfile.allergies || [])}
        {renderChipList('Favorite brands', careProfile.favoriteBrands || [])}

        {careProfile.notes ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Notes</h3>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{careProfile.notes}</p>
          </div>
        ) : null}

        {careProfile.wishlistSummary ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Wishlist summary</h3>
            <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{careProfile.wishlistSummary}</p>
          </div>
        ) : null}
      </div>
    );
  };

  const renderShareControls = () => {
    const hasActiveLink = Boolean(shareLink) || Boolean(careProfile && careProfile.shareLinkActive);
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button onClick={handleGenerateShareLink} className="inline-flex items-center gap-2 rounded-xl bg-secondary-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-secondary-500">
          <Share2 className="h-4 w-4" />
          Generate share link
        </button>
        <button onClick={handleRevokeShareLink} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700">
          <X className="h-4 w-4" />
          Revoke link
        </button>
        {shareLink ? (
          <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
            Link expires {new Date(shareLink.expiresAt).toLocaleString()}
            <button onClick={() => navigator.clipboard.writeText(shareLink.shareUrl).then(() => toast.success('Link copied'))} className="inline-flex items-center gap-1 rounded-full border border-primary-200 px-3 py-1 text-xs text-primary-600 transition hover:bg-primary-100 dark:border-primary-500/40 dark:text-primary-200">
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        ) : hasActiveLink ? (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">A share link is currently active.</span>
        ) : null}
      </div>
    );
  };

  const renderCareEditor = () => {
    if (!editingCare) return null;
    return (
      <div className="mt-4 space-y-4 rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">Update care profile</h3>
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Clothing sizes (one per line, format: Item: Size)</label>
          <textarea value={sizesInput} onChange={event => setSizesInput(event.target.value)} rows={4} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
        </div>
        {renderTextInput('Favorite colors (comma separated)', colorsInput, setColorsInput)}
        {renderTextInput('Favorite foods (comma separated)', foodsInput, setFoodsInput)}
        {renderTextInput('Interests (comma separated)', interestsInput, setInterestsInput)}
        {renderTextInput('Allergies (comma separated)', allergiesInput, setAllergiesInput)}
        {renderTextInput('Favorite brands (comma separated)', brandsInput, setBrandsInput)}
        {renderTextarea('Notes', notesInput, setNotesInput)}
        {renderTextarea('Wishlist summary', wishlistSummaryInput, setWishlistSummaryInput)}
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">Visibility</label>
          <select value={visibilityInput} onChange={event => setVisibilityInput(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white">
            <option value="FAMILY">Whole family</option>
            <option value="PARENTS">Parents and guardians</option>
            <option value="LINK">Anyone with link</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={() => { setEditingCare(false); resetCareForm(careProfile); }} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700">Cancel</button>
          <button onClick={handleSaveCareProfile} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-500">Save details</button>
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl dark:bg-neutral-800">
        <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-700">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Household Member</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">Care details and favorites</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700" aria-label="Close member details">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
            <img src={member.ProfilePhotoUrl || 'https://i.pravatar.cc/120'} alt={fullName} className="h-20 w-20 rounded-full object-cover" />
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white">{fullName}</h3>
              <div className="mt-1 inline-flex items-center rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/40 dark:text-primary-200">
                {roleLabel}
              </div>
              {joined ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                  <Calendar size={16} /> Joined {joined}
                </div>
              ) : null}
              <div className="mt-3 space-y-2 text-sm">
                {member.Email ? (
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                    <Mail size={16} />
                    <span className="truncate">{member.Email}</span>
                  </div>
                ) : null}
                {member.PhoneNumber ? (
                  <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
                    <Phone size={16} />
                    <span>{member.PhoneNumber}</span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => { setEditingCare(true); }} className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-700">
              <Edit3 className="h-4 w-4" /> Update care details
            </button>
            {renderShareControls()}
          </div>

          {renderCareSection()}

          {renderCareEditor()}
        </div>
      </div>
    </div>
  );
};

const renderChipList = (title: string, values: string[]) => {
  if (!values.length) return null;
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-700 dark:bg-neutral-900/30">
      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{title}</h3>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map(value => (
          <span key={value} className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{value}</span>
        ))}
      </div>
    </div>
  );
};

const renderTextInput = (
  label: string,
  value: string,
  setter: (next: string) => void,
) => (
  <div>
    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
    <input value={value} onChange={event => setter(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
  </div>
);

const renderTextarea = (
  label: string,
  value: string,
  setter: (next: string) => void,
) => (
  <div>
    <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">{label}</label>
    <textarea value={value} onChange={event => setter(event.target.value)} rows={3} className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white" />
  </div>
);

export default MemberProfileModal;
