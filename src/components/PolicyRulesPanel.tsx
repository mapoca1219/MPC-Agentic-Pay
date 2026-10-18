import React, { useState } from 'react';
import {
  Sliders,
  Globe,
  ShieldCheck,
  RotateCcw,
  Plus,
  Trash2,
  DollarSign,
  Building2,
  CreditCard,
} from 'lucide-react';
import {
  FX_RATES_PER_USD,
  type BlinkaCountryCode,
  type CorporatePolicyConfig,
  type WhitelistedVendorRule,
} from '../utils/financialRules';

interface PolicyRulesPanelProps {
  policy: CorporatePolicyConfig;
  onUpdatePolicy: (updated: CorporatePolicyConfig) => void;
  onResetPolicy: () => void;
}

export const PolicyRulesPanel: React.FC<PolicyRulesPanelProps> = ({
  policy,
  onUpdatePolicy,
  onResetPolicy,
}) => {
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorAmount, setNewVendorAmount] = useState('220');
  const [newVendorAccount, setNewVendorAccount] = useState('9881726354');
  const [newVendorCountry, setNewVendorCountry] = useState<BlinkaCountryCode>('US');

  const fxRates = policy.fxRates ?? FX_RATES_PER_USD;

  const handleLimitChange = (val: number) => {
    onUpdatePolicy({
      ...policy,
      maxAmountWithoutApprovalUsd: val,
    });
  };

  const handleBudgetChange = (val: number) => {
    onUpdatePolicy({
      ...policy,
      maxMonthlyBudgetUsd: val,
    });
  };

  const handleFxChange = (currency: string, val: number) => {
    if (Number.isNaN(val) || val <= 0) return;
    onUpdatePolicy({
      ...policy,
      fxRates: {
        ...fxRates,
        [currency]: val,
      },
    });
  };

  const handleVendorFieldChange = (
    vendorId: string,
    field: 'agreedAmountUsd' | 'registeredAccount' | 'country',
    value: string | number
  ) => {
    const updatedVendors = policy.whitelistedVendors.map((v) => {
      if (v.id !== vendorId) return v;
      if (field === 'agreedAmountUsd') {
        const num = typeof value === 'number' ? value : Number.parseFloat(String(value));
        return { ...v, agreedAmountUsd: Number.isNaN(num) ? 0 : num };
      }
      if (field === 'country') {
        return { ...v, country: value as BlinkaCountryCode };
      }
      return { ...v, registeredAccount: String(value) };
    });

    onUpdatePolicy({
      ...policy,
      whitelistedVendors: updatedVendors,
    });
  };

  const handleRemoveVendor = (vendorId: string) => {
    onUpdatePolicy({
      ...policy,
      whitelistedVendors: policy.whitelistedVendors.filter((v) => v.id !== vendorId),
    });
  };

  const handleAddVendor = (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!newVendorName.trim()) return;
    const amountNum = Number.parseFloat(newVendorAmount);
    const rule: WhitelistedVendorRule = {
      id: `vendor-custom-${Date.now()}`,
      displayName: newVendorName.trim(),
      aliases: [newVendorName.trim().toLowerCase()],
      agreedAmountUsd: Number.isNaN(amountNum) ? 100 : amountNum,
      toleranceUsd: 5.0,
      registeredAccount: newVendorAccount.trim() || '000-000000-00',
      country: newVendorCountry,
      category: 'Proveedor Autorizado',
    };

    onUpdatePolicy({
      ...policy,
      whitelistedVendors: [...policy.whitelistedVendors, rule],
    });
    setNewVendorName('');
  };

  const remainingBudget = Math.max(
    0,
    Number((policy.maxMonthlyBudgetUsd - policy.currentMonthSpentUsd).toFixed(2))
  );

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="bg-[#111827]/90 backdrop-blur-md rounded-2xl border border-slate-800/80 p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Sliders className="h-4 w-4 text-[#00F5D4]" />
            ⚙️ Configuración en Vivo de Reglas, Presupuesto y Lista Blanca
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ajusta los límites o edita un proveedor: Blinky re-evaluará instantáneamente todas las
            facturas en el Simulador y en el Tablero Kanban.
          </p>
        </div>

        <button
          type="button"
          onClick={onResetPolicy}
          className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar Reglas Oficiales del Reto
        </button>
      </div>

      {/* Sliders: Autonomous Limit + Monthly Budget + FX Rates */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sliders Card */}
        <div className="bg-[#111827]/90 backdrop-blur-md rounded-2xl border border-slate-800/80 p-4 sm:p-5 shadow-xl space-y-5">
          <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-[#00F5D4]" />
            Límites Financieros de Aprobación Autónoma (USD)
          </h3>

          {/* Slider 1: Max Amount Without Approval */}
          <div className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="slider-autonomous-limit"
                className="text-xs font-bold text-slate-200"
              >
                Límite de Pago Autónomo sin Permiso Humano:
              </label>
              <span className="font-mono text-sm font-black text-purple-300 bg-purple-500/20 px-2.5 py-0.5 rounded-lg border border-purple-500/40">
                ${policy.maxAmountWithoutApprovalUsd.toLocaleString('en-US')} USD
              </span>
            </div>
            <input
              id="slider-autonomous-limit"
              type="range"
              min={50}
              max={5000}
              step={50}
              value={policy.maxAmountWithoutApprovalUsd}
              onChange={(e) => handleLimitChange(Number(e.target.value))}
              className="w-full accent-purple-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>$50 USD (Estricto)</span>
              <span>$500 USD (Reto Blinka)</span>
              <span>$5,000 USD (Flexible)</span>
            </div>
          </div>

          {/* Slider 2: Monthly Budget */}
          <div className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="slider-monthly-budget" className="text-xs font-bold text-slate-200">
                Presupuesto Mensual Corporativo Total:
              </label>
              <span className="font-mono text-sm font-black text-[#00F5D4] bg-cyan-500/20 px-2.5 py-0.5 rounded-lg border border-cyan-400/40">
                ${policy.maxMonthlyBudgetUsd.toLocaleString('en-US')} USD
              </span>
            </div>
            <input
              id="slider-monthly-budget"
              type="range"
              min={1000}
              max={10000}
              step={250}
              value={policy.maxMonthlyBudgetUsd}
              onChange={(e) => handleBudgetChange(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>Ejecutado este mes: ${policy.currentMonthSpentUsd} USD</span>
              <span className="font-bold text-[#00F5D4]">
                Saldo disponible: ${remainingBudget.toLocaleString('en-US')} USD
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Currency FX Rates Card */}
        <div className="bg-[#111827]/90 backdrop-blur-md rounded-2xl border border-slate-800/80 p-4 sm:p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
              <Globe className="h-4 w-4 text-purple-400" />
              Tasas de Conversión Multimoneda (EE. UU. → LATAM)
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Equivalencia de 1.00 USD en moneda local para normalizar cuentas de cobro antes de
              evaluar reglas.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {(['COP', 'MXN', 'BRL', 'ARS', 'EUR'] as const).map((curr) => (
              <div
                key={curr}
                className="p-3 rounded-xl bg-[#0D1322] border border-slate-800 space-y-1"
              >
                <label
                  htmlFor={`fx-input-${curr}`}
                  className="text-[11px] font-bold text-slate-300 block"
                >
                  1 USD → {curr}
                </label>
                <input
                  id={`fx-input-${curr}`}
                  type="number"
                  step="any"
                  value={fxRates[curr] ?? FX_RATES_PER_USD[curr]}
                  onChange={(e) => handleFxChange(curr, Number.parseFloat(e.target.value))}
                  className="w-full rounded-lg border border-slate-700 bg-[#131B2E] px-2.5 py-1.5 font-mono text-xs font-bold text-[#00F5D4] focus:border-cyan-400 focus:outline-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Editable Whitelisted Vendors Table */}
      <div className="bg-[#111827]/90 backdrop-blur-md rounded-2xl border border-slate-800/80 p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#00F5D4]" />
              Lista Blanca de Proveedores y Cuentas Bancarias Oficiales (
              {policy.whitelistedVendors.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Edita el monto acordado en USD o la cuenta bancaria oficial registrada para probar la
              protección anti-fraude en vivo.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0D1322]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#131B2E] text-slate-300 text-[10px] uppercase border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Proveedor Autorizado</th>
                <th className="py-2.5 px-3">Categoría</th>
                <th className="py-2.5 px-3">País</th>
                <th className="py-2.5 px-3">Monto Acordado (USD)</th>
                <th className="py-2.5 px-3">Cuenta Oficial Registrada (Anti-Fraude)</th>
                <th className="py-2.5 px-3 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {policy.whitelistedVendors.map((vendor) => (
                <tr key={vendor.id} className="hover:bg-[#131B2E]/80">
                  <td className="py-2.5 px-3 font-bold text-slate-100 flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    <span>{vendor.displayName}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{vendor.category}</td>
                  <td className="py-2.5 px-3">
                    <select
                      aria-label={`País de ${vendor.displayName}`}
                      value={vendor.country}
                      onChange={(e) =>
                        handleVendorFieldChange(vendor.id, 'country', e.target.value)
                      }
                      className="rounded-lg border border-slate-700 bg-[#131B2E] px-2 py-1 font-mono text-xs font-bold text-slate-100"
                    >
                      <option value="US">US</option>
                      <option value="CO">CO</option>
                      <option value="MX">MX</option>
                      <option value="AR">AR</option>
                      <option value="BR">BR</option>
                    </select>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1 max-w-32">
                      <span className="font-mono text-slate-400">$</span>
                      <input
                        aria-label={`Monto acordado para ${vendor.displayName}`}
                        type="number"
                        value={vendor.agreedAmountUsd}
                        onChange={(e) =>
                          handleVendorFieldChange(vendor.id, 'agreedAmountUsd', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-[#131B2E] px-2 py-1 font-mono text-xs font-bold text-[#00F5D4]"
                      />
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-1.5 max-w-48">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <input
                        aria-label={`Cuenta registrada para ${vendor.displayName}`}
                        type="text"
                        value={vendor.registeredAccount}
                        onChange={(e) =>
                          handleVendorFieldChange(vendor.id, 'registeredAccount', e.target.value)
                        }
                        className="w-full rounded-lg border border-slate-700 bg-[#131B2E] px-2 py-1 font-mono text-xs text-slate-100"
                      />
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveVendor(vendor.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer transition-colors"
                      title="Eliminar de lista blanca"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Add New Whitelisted Vendor Form */}
        <form
          onSubmit={handleAddVendor}
          className="pt-3 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end"
        >
          <div className="sm:col-span-2">
            <label
              htmlFor="new-vendor-name"
              className="text-[11px] font-bold text-slate-300 block mb-1"
            >
              Agregar Proveedor a Lista Blanca (ej. Estudio Creativo Austral):
            </label>
            <input
              id="new-vendor-name"
              type="text"
              value={newVendorName}
              onChange={(e) => setNewVendorName(e.target.value)}
              placeholder="Nombre del proveedor..."
              className="w-full rounded-xl border border-slate-700 bg-[#0D1322] text-slate-100 px-3 py-2 text-xs"
            />
          </div>
          <div>
            <label
              htmlFor="new-vendor-amount"
              className="text-[11px] font-bold text-slate-300 block mb-1"
            >
              Acuerdo (USD):
            </label>
            <input
              id="new-vendor-amount"
              type="number"
              value={newVendorAmount}
              onChange={(e) => setNewVendorAmount(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-[#0D1322] text-[#00F5D4] px-3 py-2 font-mono text-xs"
            />
          </div>
          <div>
            <label
              htmlFor="new-vendor-account"
              className="text-[11px] font-bold text-slate-300 block mb-1"
            >
              Cuenta Oficial:
            </label>
            <div className="flex gap-1">
              <input
                id="new-vendor-account"
                type="text"
                value={newVendorAccount}
                onChange={(e) => setNewVendorAccount(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0D1322] text-slate-100 px-2.5 py-2 font-mono text-xs"
              />
              <select
                aria-label="País nuevo proveedor"
                value={newVendorCountry}
                onChange={(e) => setNewVendorCountry(e.target.value as BlinkaCountryCode)}
                className="rounded-xl border border-slate-700 bg-[#0D1322] text-slate-100 px-2 py-2 font-mono text-xs"
              >
                <option value="US">US</option>
                <option value="CO">CO</option>
                <option value="MX">MX</option>
                <option value="AR">AR</option>
                <option value="BR">BR</option>
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-cyan-500/20"
          >
            <Plus className="h-4 w-4" />
            Autorizar Proveedor
          </button>
        </form>
      </div>
    </div>
  );
};
