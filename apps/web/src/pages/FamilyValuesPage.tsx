import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import { useFamily } from '../hooks/useFamily';
import { useLinZChat } from '../hooks/useLinZChat';
import { updateFamily } from '../api/family';
import {
  fetchGuidelines,
  createGuideline,
  approveGuideline,
  CreateGuidelinePayload,
} from '../api/guidelines';
import type {
  GuidelineListResponse,
  GuidelineNode,
  GuidelineType,
} from '../types/guidelines';

const TAB_OPTIONS: { key: GuidelineType; label: string }[] = [
  { key: 'VALUE', label: 'Values' },
  { key: 'RULE', label: 'Rules' },
];

const NEW_RULE_LABEL_WINDOW_DAYS = parseInt(import.meta.env.VITE_NEW_RULE_WINDOW_DAYS ?? '21', 10);

const buildFlatList = (nodes: GuidelineNode[]): GuidelineNode[] => {
  const output: GuidelineNode[] = [];
  const walk = (items: GuidelineNode[]) => {
    items.forEach(item => {
      output.push(item);
      if (item.children?.length) {
        walk(item.children);
      }
    });
  };
  walk(nodes);
  return output;
};

const approvalSummary = (node: GuidelineNode) => {
  const total = node.approvals.length;
  const approved = node.approvals.filter(entry => entry.Approved).length;
  return { total, approved };
};

const FamilyValuesPage: React.FC = () => {
  const { user } = useAuth();
  const { family, isLoading: isFamilyLoading, refetchFamily } = useFamily();
  const { appendLinZMessage } = useLinZChat();

  const familyId = family?.FamilyID ?? null;

  const [activeTab, setActiveTab] = useState<GuidelineType>('VALUE');

  const [mantra, setMantra] = useState(family?.FamilyMantra ?? '');
  const [mantraSaving, setMantraSaving] = useState(false);
  const [mantraSaved, setMantraSaved] = useState(false);
  const [mantraError, setMantraError] = useState<string | null>(null);

  const [valuesData, setValuesData] = useState<GuidelineListResponse | null>(null);
  const [rulesData, setRulesData] = useState<GuidelineListResponse | null>(null);
  const [valuesLoading, setValuesLoading] = useState(false);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [valuesError, setValuesError] = useState<string | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);

  const [suggestionOpen, setSuggestionOpen] = useState(false);
  const [suggestionType, setSuggestionType] = useState<GuidelineType>('VALUE');
  const [suggestionTitle, setSuggestionTitle] = useState('');
  const [suggestionDescription, setSuggestionDescription] = useState('');
  const [suggestionParent, setSuggestionParent] = useState<number | ''>('');
  const [suggestionNotes, setSuggestionNotes] = useState('');
  const [suggestionSaving, setSuggestionSaving] = useState(false);

  useEffect(() => {
    setMantra(family?.FamilyMantra ?? '');
  }, [family?.FamilyMantra]);

  const reloadGuidelines = useCallback(async (type: GuidelineType) => {
    if (!familyId) return;
    if (type === 'VALUE') {
      try {
        setValuesLoading(true);
        setValuesError(null);
        const data = await fetchGuidelines(familyId, 'VALUE');
        setValuesData(data);
      } catch (error) {
        setValuesError(error instanceof Error ? error.message : 'Unable to load family values');
      } finally {
        setValuesLoading(false);
      }
    } else {
      try {
        setRulesLoading(true);
        setRulesError(null);
        const data = await fetchGuidelines(familyId, 'RULE');
        setRulesData(data);
      } catch (error) {
        setRulesError(error instanceof Error ? error.message : 'Unable to load family rules');
      } finally {
        setRulesLoading(false);
      }
    }
  }, [familyId]);

  useEffect(() => {
    if (!familyId) return;
    void reloadGuidelines('VALUE');
    void reloadGuidelines('RULE');
  }, [familyId, reloadGuidelines]);

  const handleSaveMantra = async () => {
    if (!family || mantraSaving) return;
    try {
      setMantraSaving(true);
      setMantraError(null);
      setMantraSaved(false);
      await updateFamily(
        family.FamilyID.toString(),
        family.FamilyName,
        mantra,
        family.FamilyValues ?? [],
      );
      await refetchFamily();
      setMantraSaved(true);
    } catch (error) {
      setMantraError(error instanceof Error ? error.message : 'Unable to update family mantra');
    } finally {
      setMantraSaving(false);
    }
  };

  const handleApprove = async (guideline: GuidelineNode, approved: boolean) => {
    if (!familyId) return;
    try {
      await approveGuideline(familyId, guideline.GuidelineID, approved);
      void reloadGuidelines(guideline.Type);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update approval');
    }
  };

  const handleOpenSuggestion = (type: GuidelineType) => {
    setSuggestionType(type);
    setSuggestionTitle('');
    setSuggestionDescription('');
    setSuggestionParent('');
    setSuggestionNotes('');
    setSuggestionOpen(true);
  };

  const handleSubmitSuggestion = async () => {
    if (!familyId) return;
    if (!suggestionTitle.trim()) {
      toast.error('A title is required');
      return;
    }
    const payload: CreateGuidelinePayload = {
      type: suggestionType,
      title: suggestionTitle.trim(),
      description: suggestionDescription.trim() ? suggestionDescription.trim() : undefined,
      parentId: suggestionParent === '' ? undefined : Number(suggestionParent),
      metadata: suggestionNotes.trim() ? { note: suggestionNotes.trim() } : undefined,
    };
    try {
      setSuggestionSaving(true);
      await createGuideline(familyId, payload);
      setSuggestionOpen(false);
      setSuggestionSaving(false);
      appendLinZMessage('I added that idea to your family review queue.');
      void reloadGuidelines(suggestionType);
    } catch (error) {
      setSuggestionSaving(false);
      toast.error(error instanceof Error ? error.message : 'Unable to submit suggestion');
    }
  };

  const valueActiveOptions = useMemo(() => buildFlatList(valuesData?.active ?? []), [valuesData]);
  const ruleActiveOptions = useMemo(() => buildFlatList(rulesData?.active ?? []), [rulesData]);

  const extractMetadataNote = (metadata: GuidelineNode['Metadata']): string | null => {
    if (!metadata || typeof metadata !== 'object') return null;
    const noteValue = (metadata as Record<string, unknown>).note;
    return typeof noteValue === 'string' && noteValue.trim() ? noteValue.trim() : null;
  };

  const formatProposerName = (person: GuidelineNode['ProposedBy']): string | null => {
    if (!person) return null;
    const name = [person.FirstName, person.LastName].filter(Boolean).join(' ').trim();
    if (name) return name;
    if (person.Email) return person.Email;
    return null;
  };

  const formatDate = (isoValue: string | null | undefined): string => {
    if (!isoValue) return 'recently';
    const parsed = new Date(isoValue);
    if (Number.isNaN(parsed.getTime())) {
      return 'recently';
    }
    return parsed.toLocaleDateString();
  };

  const renderTree = (nodes: GuidelineNode[], depth = 0) => (
    <ul className={depth === 0 ? 'space-y-2' : 'space-y-1 pl-4 border-l border-neutral-200 dark:border-neutral-700'}>
      {nodes.map(node => {
        const note = extractMetadataNote(node.Metadata);
        return (
          <li key={node.GuidelineID} className="space-y-1">
            <div className="flex items-start gap-2">
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-400"></div>
              <div>
                <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{node.Title}</p>
                {node.Description ? (
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{node.Description}</p>
                ) : null}
                {note ? (
                  <p className="text-xs italic text-neutral-400 dark:text-neutral-500">{note}</p>
                ) : null}
              </div>
            </div>
            {node.children?.length ? renderTree(node.children, depth + 1) : null}
          </li>
        );
      })}
    </ul>
  );

  const renderApprovals = (node: GuidelineNode) => {
    if (!node.approvals.length) return null;
    const summary = approvalSummary(node);
    const userApproval = node.approvals.find(entry => entry.UserID === user?.UserID);
    return (
      <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
        <span>
          {summary.approved}/{summary.total} approvals
        </span>
        {userApproval ? (
          <span className={userApproval.Approved ? 'inline-flex items-center gap-1 rounded-full bg-success-100 px-2 py-0.5 text-success-700 dark:bg-success-900/30 dark:text-success-200' : 'inline-flex items-center gap-1 rounded-full bg-warning-100 px-2 py-0.5 text-warning-700 dark:bg-warning-900/30 dark:text-warning-200'}>
            <CheckCircle2 className="h-3 w-3" />
            {userApproval.Approved ? 'You approved' : 'Awaiting your approval'}
          </span>
        ) : null}
      </div>
    );
  };

  const renderReviewCard = (node: GuidelineNode) => {
    const proposer = node.ProposedBy;
    const userApproval = node.approvals.find(entry => entry.UserID === user?.UserID);
    const proposerName = formatProposerName(proposer);
    const proposedOn = formatDate(node.ProposedAt);
    const note = extractMetadataNote(node.Metadata);
    return (
      <div key={node.GuidelineID} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm transition hover:border-primary-200 dark:border-neutral-700 dark:bg-neutral-900/40">
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{node.Title}</h3>
            {node.Description ? (
              <p className="text-sm text-neutral-600 dark:text-neutral-300">{node.Description}</p>
            ) : null}
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              Proposed {proposedOn}{proposerName ? <span> by {proposerName}</span> : null}
            </div>
            {note ? (
              <div className="rounded-xl bg-neutral-100 px-3 py-2 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">{note}</div>
            ) : null}
            {renderApprovals(node)}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleApprove(node, true)}
              disabled={!userApproval || userApproval.Approved}
              className="inline-flex items-center gap-2 rounded-xl border border-success-200 px-3 py-2 text-sm font-medium text-success-700 transition hover:bg-success-50 disabled:opacity-60 dark:border-success-500/40 dark:text-success-200"
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => handleApprove(node, false)}
              className="inline-flex items-center gap-2 rounded-xl border border-warning-200 px-3 py-2 text-sm font-medium text-warning-700 transition hover:bg-warning-50 dark:border-warning-500/40 dark:text-warning-200"
            >
              <AlertCircle className="h-4 w-4" /> Needs more time
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderValuesTab = () => {
    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Values under review</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Approve ideas so they become part of your family culture.</p>
            </div>
            <button
              onClick={() => handleOpenSuggestion('VALUE')}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-3 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50 dark:border-primary-500/40 dark:text-primary-200 dark:hover:bg-primary-900/30"
            >
              <Plus className="h-4 w-4" /> Suggest a value
            </button>
          </header>
          {valuesLoading ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">Loading…</div>
          ) : valuesError ? (
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-900/30 dark:text-error-200">{valuesError}</div>
          ) : (valuesData?.underReview?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">
              Nothing is waiting right now. Ask LinZ to collect new value ideas!
            </div>
          ) : (
            <div className="space-y-3">
              {valuesData?.underReview.map(renderReviewCard)}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Agreed values</h2>
          {valuesLoading ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">Loading…</div>
          ) : (valuesData?.active?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">
              No agreed values yet. Suggest one to start your list.
            </div>
          ) : (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-700 dark:bg-neutral-900/30">
              {renderTree(valuesData?.active ?? [])}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderNewRules = () => {
    const list = rulesData?.newRules ?? [];
    if (!list.length) return null;
    return (
      <section className="space-y-3">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">New rules</h2>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">These rules are new for {NEW_RULE_LABEL_WINDOW_DAYS} days so everyone can adjust.</p>
          </div>
        </header>
        <div className="space-y-3">
          {list.map(rule => {
            const note = extractMetadataNote(rule.Metadata);
            const becomesPermanent = rule.ExpiresAt ? formatDate(rule.ExpiresAt) : null;
            return (
              <div key={rule.GuidelineID} className="rounded-2xl border border-warning-200 bg-warning-50 p-5 dark:border-warning-500/40 dark:bg-warning-900/30">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-warning-800 dark:text-warning-200">{rule.Title}</h3>
                    {rule.Description ? <p className="text-sm text-warning-700 dark:text-warning-200/80">{rule.Description}</p> : null}
                    {note ? <p className="text-xs italic text-warning-700 dark:text-warning-200/70">{note}</p> : null}
                    <p className="text-xs text-warning-700 dark:text-warning-200/80">Active since {formatDate(rule.ActivatedAt)}</p>
                    {becomesPermanent ? (
                      <p className="text-xs text-warning-700 dark:text-warning-200/70">Becomes permanent on {becomesPermanent}</p>
                    ) : null}
                    {rule.children?.length ? renderTree(rule.children) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderRulesTab = () => {
    const newRuleIds = new Set((rulesData?.newRules ?? []).map(rule => rule.GuidelineID));
    const activeRules = (rulesData?.active ?? []).filter(rule => !newRuleIds.has(rule.GuidelineID));

    return (
      <div className="space-y-6">
        <section className="space-y-3">
          <header className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Rules under review</h2>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Approve rules to make them official family expectations.</p>
            </div>
            <button
              onClick={() => handleOpenSuggestion('RULE')}
              className="inline-flex items-center gap-2 rounded-xl border border-primary-200 px-3 py-2 text-sm font-medium text-primary-600 transition hover:bg-primary-50 dark:border-primary-500/40 dark:text-primary-200 dark:hover:bg-primary-900/30"
            >
              <Plus className="h-4 w-4" /> Suggest a rule
            </button>
          </header>
          {rulesLoading ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">Loading…</div>
          ) : rulesError ? (
            <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-3 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-900/30 dark:text-error-200">{rulesError}</div>
          ) : (rulesData?.underReview?.length ?? 0) === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">
              No rules waiting right now. Ask LinZ to draft one when you need it.
            </div>
          ) : (
            <div className="space-y-3">
              {rulesData?.underReview.map(renderReviewCard)}
            </div>
          )}
        </section>

        {renderNewRules()}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Family rules</h2>
          {rulesLoading ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-center text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">Loading…</div>
          ) : activeRules.length === 0 ? (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900/30">
              No active rules yet. Suggest one to set expectations together.
            </div>
          ) : (
            <div className="space-y-3">
              {activeRules.map(rule => {
                const note = extractMetadataNote(rule.Metadata);
                const activatedOn = formatDate(rule.ActivatedAt);
                return (
                  <div key={rule.GuidelineID} className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-700 dark:bg-neutral-900/30">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{rule.Title}</h3>
                        {rule.Description ? <p className="text-sm text-neutral-600 dark:text-neutral-300">{rule.Description}</p> : null}
                        {note ? <p className="text-xs italic text-neutral-500 dark:text-neutral-400">{note}</p> : null}
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">Active since {activatedOn}</p>
                        {rule.children?.length ? renderTree(rule.children) : null}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    );
  };

  const renderActiveTab = () => (activeTab === 'VALUE' ? renderValuesTab() : renderRulesTab());

  const suggestionParents = suggestionType === 'VALUE' ? valueActiveOptions : ruleActiveOptions;

  if (isFamilyLoading && !family) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!family) {
    return (
      <div className="rounded-2xl bg-white dark:bg-neutral-800 shadow-card p-8">
        <h1 className="text-2xl font-semibold text-neutral-900 dark:text-white mb-2">No Family Selected</h1>
        <p className="text-neutral-500 dark:text-neutral-400 mb-4">
          Join or create a family to define shared values and rules.
        </p>
        <Link
          to="/family"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-primary-500 text-white hover:bg-primary-600 dark:hover:bg-primary-400 transition-colors"
        >
          <ArrowLeft size={18} className="mr-2" />
          Go to Family Settings
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">{family.FamilyName} Values & Rules</h1>
          <p className="text-neutral-500 dark:text-neutral-400">Review what your household stands for and keep new ideas moving forward.</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/family"
            className="inline-flex items-center px-4 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            Family Overview
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Family mantra</h2>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Display this on your dashboard to keep everyone focused.</p>
              </div>
              {mantraSaved ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-success-100 px-3 py-1 text-xs font-medium text-success-700 dark:bg-success-900/30 dark:text-success-200">
                  <ShieldCheck className="h-3 w-3" /> Saved
                </span>
              ) : null}
            </div>
            <textarea
              rows={3}
              value={mantra}
              onChange={event => {
                setMantra(event.target.value);
                setMantraSaved(false);
              }}
              placeholder="Together we..."
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400"
            />
            {mantraError ? (
              <div className="rounded-xl border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-900/30 dark:text-error-200">{mantraError}</div>
            ) : null}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setMantra(family.FamilyMantra ?? '')}
                className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-600 transition hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-700"
              >
                <RefreshCw className="h-4 w-4" /> Reset
              </button>
              <button
                onClick={handleSaveMantra}
                disabled={mantraSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-primary-500 disabled:opacity-50"
              >
                {mantraSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save mantra
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-800 rounded-2xl shadow-card p-2">
            <div className="flex rounded-xl bg-neutral-100 p-1 dark:bg-neutral-900/40">
              {TAB_OPTIONS.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                    activeTab === tab.key
                      ? 'bg-white text-primary-600 shadow dark:bg-neutral-700 dark:text-white'
                      : 'text-neutral-600 hover:bg-white/60 dark:text-neutral-300 dark:hover:bg-neutral-700/60'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="p-4 lg:p-6">{renderActiveTab()}</div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-700 dark:bg-neutral-900/30">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">Tips</h3>
            <ul className="mt-3 space-y-2 text-sm text-neutral-600 dark:text-neutral-300">
              <li>Any family member can suggest a value or rule.</li>
              <li>Everything stays in review until everyone approves it.</li>
              <li>Rules stay "new" for {NEW_RULE_LABEL_WINDOW_DAYS} days so the household can adjust.</li>
            </ul>
          </div>
        </aside>
      </div>

      {suggestionOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-neutral-800">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-700">
              <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">
                Suggest a {suggestionType === 'VALUE' ? 'family value' : 'family rule'}
              </h2>
              <button onClick={() => setSuggestionOpen(false)} className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">&times;</button>
            </div>
            <div className="space-y-4 p-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Title</label>
                <input
                  value={suggestionTitle}
                  onChange={event => setSuggestionTitle(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Description</label>
                <textarea
                  rows={3}
                  value={suggestionDescription}
                  onChange={event => setSuggestionDescription(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  placeholder={suggestionType === 'VALUE' ? 'Add context so everyone understands the idea' : 'Describe when this rule applies and why it matters'}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Parent {suggestionType === 'VALUE' ? 'value' : 'rule'} (optional)</label>
                <select
                  value={suggestionParent}
                  onChange={event => setSuggestionParent(event.target.value ? Number(event.target.value) : '')}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                >
                  <option value="">Top level</option>
                  {suggestionParents.map(node => (
                    <option key={node.GuidelineID} value={node.GuidelineID}>{node.Title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Notes for your family (optional)</label>
                <textarea
                  rows={3}
                  value={suggestionNotes}
                  onChange={event => setSuggestionNotes(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-neutral-300 px-3 py-2 text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
                  placeholder={suggestionType === 'RULE' ? 'Explain how this rule connects to your values' : 'Add examples, stories, or inspiration'}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-neutral-200 p-4 dark:border-neutral-700">
              <button onClick={() => setSuggestionOpen(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-700">Cancel</button>
              <button onClick={handleSubmitSuggestion} disabled={suggestionSaving} className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-500 disabled:opacity-50">
                {suggestionSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Submit
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default FamilyValuesPage;
