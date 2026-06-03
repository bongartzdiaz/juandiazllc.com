'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/philly/layout/Topbar'
import { useToast } from '@/hooks/philly/useToast'
import { useConfirm } from '@/hooks/philly/useConfirm'
import { useTranslations } from 'next-intl'
import { Plus, Trash2, Save, MapPin, Tag, Home, Flag as FlagIcon, RotateCcw } from 'lucide-react'
import { PRESETS } from '@/lib/philly/constants/property-presets'

type Option = { value: string; label: string }
type Flag = { key: string; label: string }

interface Taxonomy {
  countryLabel: string
  districts: Option[]
  propertyTypes: Option[]
  subtypes: Record<string, Option[]>
  listingTypes: Option[]
  flags: Flag[]
}

const cardStyle: React.CSSProperties = {
  background: 'var(--panel)', border: '1px solid var(--border)',
  borderRadius: 12, padding: 20, marginBottom: 16,
  boxShadow: 'var(--shadow-sm)',
}

const inputStyle: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 6,
  border: '1px solid var(--border)', background: 'var(--bg2)',
  fontSize: 12, color: 'var(--txt)', fontFamily: 'inherit', outline: 'none',
  minWidth: 0,
}

const btnIconStyle: React.CSSProperties = {
  padding: 6, borderRadius: 6, border: '1px solid var(--border)',
  background: 'var(--panel)', color: 'var(--txt2)',
  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8, border: 'none',
  background: 'var(--accent)', color: '#fff',
  fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  display: 'inline-flex', alignItems: 'center', gap: 6,
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8,
  border: '1px solid var(--border)', background: 'var(--panel)',
  color: 'var(--txt2)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 6,
}

function slugify(input: string) {
  return input.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64) || 'unnamed'
}

/* Editable list of {value, label} pairs */
function OptionListEditor({
  options, onChange, placeholder,
}: { options: Option[]; onChange: (o: Option[]) => void; placeholder?: string }) {
  const [newLabel, setNewLabel] = useState('')
  const t = useTranslations('propertyTaxonomy')
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {options.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic', padding: '8px 0' }}>
            {t('list.noneYet')}
          </div>
        )}
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 6 }}>
            <input
              value={opt.label}
              placeholder={t('list.displayLabel')}
              onChange={e => {
                const next = options.slice()
                next[i] = { ...next[i], label: e.target.value }
                onChange(next)
              }}
              style={inputStyle}
              aria-label={t('list.displayLabel')}
            />
            <input
              value={opt.value}
              placeholder={t('list.internalValue')}
              onChange={e => {
                const next = options.slice()
                next[i] = { ...next[i], value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }
                onChange(next)
              }}
              style={{ ...inputStyle, fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 11 }}
              aria-label={t('list.internalValue')}
            />
            <button
              type="button"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              style={btnIconStyle}
              title={t('list.remove')}
            ><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder={placeholder ?? t('list.addNew')}
          style={{ ...inputStyle, flex: 1 }}
          aria-label={placeholder ?? t('list.addNew')}
          onKeyDown={e => {
            if (e.key === 'Enter' && newLabel.trim()) {
              onChange([...options, { value: slugify(newLabel), label: newLabel.trim() }])
              setNewLabel('')
            }
          }}
        />
        <button
          type="button"
          onClick={() => {
            if (!newLabel.trim()) return
            onChange([...options, { value: slugify(newLabel), label: newLabel.trim() }])
            setNewLabel('')
          }}
          style={{ ...btnSecondary, padding: '6px 12px' }}
        ><Plus size={13} /> {t('list.add')}</button>
      </div>
    </div>
  )
}

export default function PropertyTaxonomyPage() {
  const [tax, setTax] = useState<Taxonomy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()
  const confirm = useConfirm()
  const tConfirms = useTranslations('confirms')
  const tCommon = useTranslations('common')
  const t = useTranslations('propertyTaxonomy')

  useEffect(() => {
    fetch('/api/properties/taxonomy')
      .then(r => r.json())
      .then(json => { if (json.data) setTax(json.data) })
      .catch(() => addToast(t('toasts.loadFailed'), 'error'))
      .finally(() => setLoading(false))
  }, [addToast, t])

  const applyPreset = async (presetId: string) => {
    const p = PRESETS.find(x => x.id === presetId)
    if (!p) return
    const ok = await confirm({
      title: tConfirms('replaceTaxonomyPreset.title', { preset: p.countryLabel }),
      body: tConfirms('replaceTaxonomyPreset.body'),
      confirmLabel: tCommon('replace'),
      cancelLabel: tCommon('cancel'),
      danger: true,
    })
    if (!ok) return
    setTax({
      countryLabel: p.countryLabel,
      districts: p.districts,
      propertyTypes: p.propertyTypes,
      subtypes: p.subtypes,
      listingTypes: p.listingTypes,
      flags: p.flags,
    })
  }

  const save = async () => {
    if (!tax) return
    setSaving(true)
    try {
      const res = await fetch('/api/properties/taxonomy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tax),
      })
      if (res.ok) {
        const json = await res.json()
        if (json.data) setTax(json.data)
        addToast(t('toasts.saved'), 'success')
      } else {
        const err = await res.json().catch(() => ({}))
        addToast(err.error ?? t('toasts.saveFailed'), 'error')
      }
    } catch {
      addToast(t('toasts.saveFailed'), 'error')
    }
    setSaving(false)
  }

  const typesList = tax?.propertyTypes ?? []

  if (loading) {
    return <>
      <Topbar title={t('title')} sub={t('subtitle')} />
      <div style={{ padding: 24, color: 'var(--txt3)', fontSize: 13 }}>{t('loading')}</div>
    </>
  }

  if (!tax) return null

  return (
    <>
      <Topbar
        title={t('title')}
        sub={t('subtitle')}
      />
      <div style={{ padding: '18px 24px 40px', maxWidth: 960 }}>
        {/* Presets */}
        <div style={{ ...cardStyle }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{t('presets.title')}</div>
              <div style={{ fontSize: 12, color: 'var(--txt3)' }}>
                {t('presets.help')}
              </div>
            </div>
            <RotateCcw size={14} style={{ color: 'var(--txt3)', flexShrink: 0, marginTop: 4 }} />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                style={{
                  ...btnSecondary,
                  padding: '6px 12px',
                  background: tax.countryLabel === p.countryLabel ? 'var(--accent-bg)' : 'var(--panel)',
                  color: tax.countryLabel === p.countryLabel ? 'var(--accent-txt)' : 'var(--txt2)',
                  borderColor: tax.countryLabel === p.countryLabel ? 'var(--accent)' : 'var(--border)',
                }}
              >{p.countryLabel}</button>
            ))}
          </div>
        </div>

        {/* Country label */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MapPin size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t('country.title')}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 10 }}>
            {t('country.help')}
          </div>
          <input
            value={tax.countryLabel}
            onChange={e => setTax({ ...tax, countryLabel: e.target.value })}
            style={{ ...inputStyle, width: 280 }}
            aria-label={t('country.title')}
          />
        </div>

        {/* Districts */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MapPin size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t('districts.title')}</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>{t('districts.entries', { count: tax.districts.length })}</span>
          </div>
          <OptionListEditor
            options={tax.districts}
            onChange={o => setTax({ ...tax, districts: o })}
            placeholder={t('districts.placeholder')}
          />
        </div>

        {/* Listing types */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Tag size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t('listingTypes.title')}</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>
              {t('listingTypes.valuesNote')} <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4 }}>sale</code> / <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4 }}>rent</code>
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 10 }}>
            {t('listingTypes.help')}
          </div>
          <OptionListEditor
            options={tax.listingTypes}
            onChange={o => setTax({ ...tax, listingTypes: o })}
            placeholder={t('listingTypes.placeholder')}
          />
        </div>

        {/* Property types */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Home size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t('propertyTypes.title')}</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>{t('propertyTypes.count', { count: tax.propertyTypes.length })}</span>
          </div>
          <OptionListEditor
            options={tax.propertyTypes}
            onChange={o => setTax({ ...tax, propertyTypes: o })}
            placeholder={t('propertyTypes.placeholder')}
          />
        </div>

        {/* Subtypes — one section per top-level type */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Tag size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t('subtypes.title')}</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>
            {t('subtypes.help')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {typesList.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>
                {t('subtypes.empty')}
              </div>
            )}
            {typesList.map(pt => {
              const subs = tax.subtypes[pt.value] ?? []
              return (
                <div key={pt.value} style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 700, marginBottom: 10, color: 'var(--txt)' }}>
                    {pt.label} <span style={{ color: 'var(--txt3)', fontWeight: 400 }}>· {subs.length}</span>
                  </div>
                  <OptionListEditor
                    options={subs}
                    onChange={o => setTax({ ...tax, subtypes: { ...tax.subtypes, [pt.value]: o } })}
                    placeholder={t('subtypes.addSubtype', { label: pt.label })}
                  />
                </div>
              )
            })}
          </div>
        </div>

        {/* Flags */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <FlagIcon size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>{t('flags.title')}</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>
              {t('flags.keysNote')} <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4 }}>isBankOwned</code> / <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4 }}>isResale</code>
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 10 }}>
            {t('flags.help')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {tax.flags.map((f, i) => (
              <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 6 }}>
                <input
                  value={f.label}
                  onChange={e => {
                    const next = tax.flags.slice()
                    next[i] = { ...next[i], label: e.target.value }
                    setTax({ ...tax, flags: next })
                  }}
                  style={inputStyle}
                  aria-label={t('list.displayLabel')}
                />
                <input
                  value={f.key}
                  readOnly
                  style={{ ...inputStyle, fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 11, opacity: 0.7 }}
                  aria-label={t('list.internalValue')}
                />
                <button
                  type="button"
                  onClick={() => setTax({ ...tax, flags: tax.flags.filter((_, j) => j !== i) })}
                  style={btnIconStyle}
                  title={t('list.remove')}
                ><Trash2 size={13} /></button>
              </div>
            ))}
            {tax.flags.length < 2 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {!tax.flags.find(f => f.key === 'isBankOwned') && (
                  <button
                    type="button"
                    onClick={() => setTax({ ...tax, flags: [...tax.flags, { key: 'isBankOwned', label: t('flags.bankOwned') }] })}
                    style={{ ...btnSecondary, padding: '6px 12px' }}
                  ><Plus size={13} /> {t('flags.restoreBankOwned')}</button>
                )}
                {!tax.flags.find(f => f.key === 'isResale') && (
                  <button
                    type="button"
                    onClick={() => setTax({ ...tax, flags: [...tax.flags, { key: 'isResale', label: t('flags.resale') }] })}
                    style={{ ...btnSecondary, padding: '6px 12px' }}
                  ><Plus size={13} /> {t('flags.restoreResale')}</button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Sticky save bar */}
        <div style={{
          position: 'sticky', bottom: 0,
          background: 'var(--panel)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '12px 16px',
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
          >
            <Save size={14} /> {saving ? t('saving') : t('save')}
          </button>
        </div>
      </div>
    </>
  )
}
