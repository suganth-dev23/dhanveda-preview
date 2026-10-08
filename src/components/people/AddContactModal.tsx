import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useFinance } from '../../context/FinanceContext';
import { UserPlus, AlertCircle } from 'lucide-react';
import { useSubmitOnce } from '../../hooks/useSubmitOnce';

interface AddContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddContactModal: React.FC<AddContactModalProps> = ({ isOpen, onClose }) => {
  const { contacts, addContact } = useFinance();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { isSubmitting, startSubmit, reset } = useSubmitOnce();
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      prevIsOpenRef.current = false;
      return;
    }
    const isOpening = isOpen && !prevIsOpenRef.current;
    if (isOpening) {
      reset();
      setName('');
      setPhone('');
      setEmail('');
      setNotes('');
      setError(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [isOpen, reset]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!startSubmit()) return;

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please enter a valid person name.');
      reset();
      return;
    }

    // Duplicate contact check (case-insensitive trim)
    const isDuplicate = contacts.some(
      c => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
    );
    if (isDuplicate) {
      setError(`A contact named "${trimmedName}" already exists.`);
      reset();
      return;
    }

    // Phone sanitization: allow optional leading +, strip formatting characters
    let sanitizedPhone: string | undefined = undefined;
    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      const cleaned = trimmedPhone.replace(/[^\d+]/g, '');
      const digitsOnly = cleaned.replace(/\D/g, '');
      if (digitsOnly.length < 7 || digitsOnly.length > 15) {
        setError('Please enter a valid phone number (7 to 15 digits).');
        reset();
        return;
      }
      sanitizedPhone = cleaned;
    }

    // Email sanitization: trim, lowercase, validate standard email format
    let sanitizedEmail: string | undefined = undefined;
    const trimmedEmail = email.trim();
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedEmail)) {
        setError('Please enter a valid email address (e.g. name@example.com).');
        reset();
        return;
      }
      sanitizedEmail = trimmedEmail.toLowerCase();
    }

    addContact({
      name: trimmedName,
      phone: sanitizedPhone,
      email: sanitizedEmail,
      notes: notes.trim() || undefined,
    });

    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setError(null);
    onClose();
  };

  const handleClose = () => {
    setName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add New Person"
      subtitle="Track split bills and debts with friends, family, or roommates"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-600 dark:text-rose-400 font-semibold">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Full Name / Nickname *
          </label>
          <input
            type="text"
            required
            data-autofocus
            value={name}
            onChange={e => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            placeholder="e.g. Rahul Sharma, Priya (Roommate)"
            className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm font-semibold text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Phone Number (Optional)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => {
                setPhone(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. +91 9876543210"
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Email Address (Optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. rahul@example.com"
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Notes / UPI ID (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. rahul@okhdfcbank or Flat 302 split"
            className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-ink-2 hover:bg-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-on-primary shadow-xs transition-colors active:scale-95 ${
              isSubmitting ? 'bg-ink-3/40 cursor-not-allowed opacity-50' : 'bg-primary hover:opacity-95'
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Person</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
