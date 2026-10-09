import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../common/Modal';
import { useFinance } from '../../context/FinanceContext';
import { Investment, InvestmentType } from '../../types/finance';
import { numberToWordsINR } from '../../utils/currency';
import { useSubmitOnce } from '../../hooks/useSubmitOnce';
import { MAX_AMOUNT, MIN_AMOUNT, isValidAmount, roundMoney } from '../../utils/validation';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialInvestment?: Investment | null;
}

const INVESTMENT_TYPES: InvestmentType[] = [
  'Mutual Funds',
  'Stocks',
  'Fixed Deposit (FD)',
  'Recurring Deposit (RD)',
  'Gold / SGB',
  'PPF / EPF',
  'NPS',
  'Crypto',
  'Real Estate',
  'Bonds / Debt',
  'Other',
];

export const InvestmentModal: React.FC<InvestmentModalProps> = ({
  isOpen,
  onClose,
  initialInvestment,
}) => {
  const { addInvestment, updateInvestment } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<InvestmentType>('Mutual Funds');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [sipAmount, setSipAmount] = useState('');
  const [sipDay, setSipDay] = useState('');
  const [platform, setPlatform] = useState('');
  const [notes, setNotes] = useState('');

  // Unit calculator (Stocks, Mutual Funds, Gold)
  const [useUnitCalc, setUseUnitCalc] = useState(false);
  const [quantity, setQuantity] = useState('');
  const [buyPrice, setBuyPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
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
    }
    if (initialInvestment) {
      setName(initialInvestment.name);
      setType(initialInvestment.type);
      setInvestedAmount(initialInvestment.investedAmount.toString());
      setCurrentValue(initialInvestment.currentValue.toString());
      setSipAmount(initialInvestment.sipAmount ? initialInvestment.sipAmount.toString() : '');
      setSipDay(initialInvestment.sipDay ? initialInvestment.sipDay.toString() : '');
      setPlatform(initialInvestment.platform || '');
      setNotes(initialInvestment.notes || '');
      setUseUnitCalc(false);
      setQuantity('');
      setBuyPrice('');
      setCurrentPrice('');
      setFormError(null);
    } else {
      setName('');
      setType('Mutual Funds');
      setInvestedAmount('');
      setCurrentValue('');
      setSipAmount('');
      setSipDay('');
      setPlatform('Zerodha');
      setNotes('');
      setUseUnitCalc(false);
      setQuantity('');
      setBuyPrice('');
      setCurrentPrice('');
      setFormError(null);
    }
    prevIsOpenRef.current = isOpen;
  }, [initialInvestment, isOpen, reset]);

  const handleQuantityChange = (val: string) => {
    setQuantity(val);
    setFormError(null);
    const q = parseFloat(val);
    const bp = parseFloat(buyPrice);
    const cp = parseFloat(currentPrice);
    if (!isNaN(q) && q > 0) {
      if (!isNaN(bp) && bp > 0) {
        setInvestedAmount((q * bp).toFixed(2));
      }
      if (!isNaN(cp) && cp >= 0) {
        setCurrentValue((q * cp).toFixed(2));
      }
    }
  };

  const handleBuyPriceChange = (val: string) => {
    setBuyPrice(val);
    setFormError(null);
    const bp = parseFloat(val);
    const q = parseFloat(quantity);
    if (!isNaN(bp) && bp > 0 && !isNaN(q) && q > 0) {
      setInvestedAmount((q * bp).toFixed(2));
    }
  };

  const handleCurrentPriceChange = (val: string) => {
    setCurrentPrice(val);
    setFormError(null);
    const cp = parseFloat(val);
    const q = parseFloat(quantity);
    if (!isNaN(cp) && cp >= 0 && !isNaN(q) && q > 0) {
      setCurrentValue((q * cp).toFixed(2));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!startSubmit()) return;

    if (!name.trim()) {
      setFormError('Please enter an investment name');
      reset();
      return;
    }

    if (useUnitCalc) {
      if (quantity.trim() !== '') {
        const q = parseFloat(quantity);
        if (isNaN(q) || q <= 0 || q > MAX_AMOUNT) {
          setFormError(`Quantity must be greater than 0 and less than ${MAX_AMOUNT.toLocaleString('en-IN')}`);
          reset();
          return;
        }
      }
      if (buyPrice.trim() !== '') {
        const bp = parseFloat(buyPrice);
        if (isNaN(bp) || bp <= 0 || !isValidAmount(bp)) {
          setFormError(`Buy price per unit must be between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
          reset();
          return;
        }
      }
      if (currentPrice.trim() !== '') {
        const cp = parseFloat(currentPrice);
        if (isNaN(cp) || cp < 0 || cp > MAX_AMOUNT) {
          setFormError(`Current price per unit must be between ₹0 and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
          reset();
          return;
        }
      }
    }

    const inv = parseFloat(investedAmount);
    const curr = parseFloat(currentValue);

    if (!investedAmount.trim() || isNaN(inv) || !isValidAmount(inv)) {
      setFormError(`Total invested amount must be between ₹${MIN_AMOUNT} and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      reset();
      return;
    }
    if (!currentValue.trim() || isNaN(curr) || curr < 0 || curr > MAX_AMOUNT) {
      setFormError(`Current market valuation must be between ₹0 and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
      reset();
      return;
    }

    let sip: number | undefined = undefined;
    if (sipAmount.trim() !== '') {
      const parsedSip = parseFloat(sipAmount);
      if (isNaN(parsedSip) || parsedSip < 0 || parsedSip > MAX_AMOUNT) {
        setFormError(`Monthly SIP amount must be between ₹0 and ₹${MAX_AMOUNT.toLocaleString('en-IN')}`);
        reset();
        return;
      }
      sip = roundMoney(parsedSip);
    }

    let day: number | undefined = undefined;
    if (sipDay.trim() !== '') {
      const parsedDay = parseInt(sipDay, 10);
      if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 28) {
        setFormError('SIP debit day must be between 1 and 28');
        reset();
        return;
      }
      day = parsedDay;
    }

    const finalInv = roundMoney(inv);
    const finalCurr = roundMoney(curr);

    if (initialInvestment) {
      updateInvestment(initialInvestment.id, {
        name: name.trim(),
        type,
        investedAmount: finalInv,
        currentValue: finalCurr,
        sipAmount: sip,
        sipDay: day,
        platform: platform.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    } else {
      addInvestment({
        name: name.trim(),
        type,
        investedAmount: finalInv,
        currentValue: finalCurr,
        sipAmount: sip,
        sipDay: day,
        platform: platform.trim() || undefined,
        notes: notes.trim() || undefined,
      });
    }
    onClose();
  };

  const parsedVal = parseFloat(currentValue) || 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialInvestment ? 'Update Investment Holding' : 'Add New Investment'}
      subtitle="Log asset valuations across Indian equities, mutual funds, gold, and fixed income"
      maxWidth="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name & Asset Class */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Investment / Scheme Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Parag Parikh Flexi Cap, HDFC Bank, SGB 2024"
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Asset Type *
            </label>
            <select
              value={type}
              onChange={e => setType(e.target.value as InvestmentType)}
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            >
              {INVESTMENT_TYPES.map(t => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Form Error Alert */}
        {formError && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-semibold text-rose-600 dark:text-rose-400">
            {formError}
          </div>
        )}

        {/* Optional Unit / Quantity Calculator */}
        <div className="p-3.5 bg-sunken rounded-xl border border-line space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-2">
              Per-Unit Calculator (Optional — Stocks, MF units, Gold)
            </span>
            <button
              type="button"
              onClick={() => setUseUnitCalc(!useUnitCalc)}
              className="text-xs text-primary font-semibold hover:underline"
            >
              {useUnitCalc ? 'Hide Units' : 'Calculate from Units'}
            </button>
          </div>
          {useUnitCalc && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-ink-3 mb-1">
                  Quantity (Units &gt; 0)
                </label>
                <input
                  type="number"
                  step="any"
                  min="0.0001"
                  max={MAX_AMOUNT}
                  value={quantity}
                  onChange={e => handleQuantityChange(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-numeric font-bold text-ink-1 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-3 mb-1">
                  Buy Price / Unit (₹ &gt; 0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={MIN_AMOUNT}
                  max={MAX_AMOUNT}
                  value={buyPrice}
                  onChange={e => handleBuyPriceChange(e.target.value)}
                  placeholder="e.g. 250"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-numeric font-bold text-ink-1 focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-3 mb-1">
                  Current Price / Unit (₹ &ge; 0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={MAX_AMOUNT}
                  value={currentPrice}
                  onChange={e => handleCurrentPriceChange(e.target.value)}
                  placeholder="e.g. 280"
                  className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-xs font-numeric font-bold text-ink-1 focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Invested Amount & Current Valuation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Total Invested (INR ₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min={MIN_AMOUNT}
              max={MAX_AMOUNT}
              inputMode="decimal"
              required
              value={investedAmount}
              onChange={e => setInvestedAmount(e.target.value)}
              placeholder="0.00"
              className="font-numeric tabular-nums w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm font-bold text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Current Market Value (INR ₹) *
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={MAX_AMOUNT}
              inputMode="decimal"
              required
              value={currentValue}
              onChange={e => setCurrentValue(e.target.value)}
              placeholder="0.00"
              className="font-numeric tabular-nums w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm font-bold text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>
        {parsedVal > 0 && (
          <p className="text-xs text-emerald-800 dark:text-emerald-300 font-semibold italic">
            Current Valuation: {numberToWordsINR(parsedVal)}
          </p>
        )}

        {/* Platform & Monthly SIP */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Broker / Platform
            </label>
            <input
              type="text"
              value={platform}
              onChange={e => setPlatform(e.target.value)}
              placeholder="e.g. Zerodha, Groww, Kuvera, HDFC"
              className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              Monthly SIP (Optional ₹)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max={MAX_AMOUNT}
              inputMode="decimal"
              value={sipAmount}
              onChange={e => setSipAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="font-numeric tabular-nums w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
              SIP Debit Day
            </label>
            <input
              type="number"
              inputMode="numeric"
              min="1"
              max="28"
              value={sipDay}
              onChange={e => setSipDay(e.target.value)}
              placeholder="e.g. 5"
              className="font-numeric tabular-nums w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-ink-3 mb-1.5">
            Strategy Notes / Description
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Long term retirement core equity compounding"
            className="w-full rounded-xl border border-line bg-sunken px-3.5 py-2.5 text-sm text-ink-1 focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-ink-2 hover:bg-sunken transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-on-primary transition-colors duration-150 ${
              isSubmitting ? 'bg-ink-3/40 cursor-not-allowed opacity-50' : 'bg-primary hover:opacity-95 shadow-md shadow-xs active:scale-95'
            }`}
          >
            {initialInvestment ? 'Update Holding' : 'Save Investment'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
