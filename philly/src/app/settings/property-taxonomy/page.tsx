'use client'

import { useState, useEffect } from 'react'
import { Topbar } from '@/components/layout/Topbar'
import { useToast } from '@/hooks/useToast'
import { Plus, Trash2, Save, MapPin, Tag, Home, Flag as FlagIcon, RotateCcw } from 'lucide-react'
import { PRESETS } from '@/lib/constants/property-presets'

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
  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
        {options.length === 0 && (
          <div style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic', padding: '8px 0' }}>
            None yet — add one below.
          </div>
        )}
        {options.map((opt, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 32px', gap: 6 }}>
            <input
              value={opt.label}
              placeholder="Display label"
              onChange={e => {
                const next = options.slice()
                next[i] = { ...next[i], label: e.target.value }
                onChange(next)
              }}
              style={inputStyle}
            />
            <input
              value={opt.value}
              placeholder="internal_value"
              onChange={e => {
                const next = options.slice()
                next[i] = { ...next[i], value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }
                onChange(next)
              }}
              style={{ ...inputStyle, fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 11 }}
            />
            <button
              type="button"
              onClick={() => onChange(options.filter((_, j) => j !== i))}
              style={btnIconStyle}
              title="Remove"
            ><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={newLabel}
          onChange={e => setNewLabel(e.target.value)}
          placeholder={placeholder ?? 'Add new...'}
          style={{ ...inputStyle, flex: 1 }}
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
        ><Plus size={13} /> Add</button>
      </div>
    </div>
  )
}

export default function PropertyTaxonomyPage() {
  const [tax, setTax] = useState<Taxonomy | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()

  useEffect(() => {
    fetch('/api/properties/taxonomy')
      .then(r => r.json())
      .then(json => { if (json.data) setTax(json.data) })
      .catch(() => addToast('Failed to load taxonomy', 'error'))
      .finally(() => setLoading(false))
  }, [addToast])

  const applyPreset = (presetId: string) => {
    const p = PRESETS.find(x => x.id === presetId)
    if (!p) return
    if (!confirm(`Replace current taxonomy with "${p.countryLabel}" preset?\n\nThis will overwrite all districts, types, subtypes, listing labels, and flag labels.`)) return
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
        addToast('Taxonomy saved', 'success')
      } else {
        const err = await res.json().catch(() => ({}))
        addToast(err.error ?? 'Save failed', 'error')
      }
    } catch {
      addToast('Save failed', 'error')
    }
    setSaving(false)
  }

  const typesList = tax?.propertyTypes ?? []

  if (loading) {
    return <>
      <Topbar title="Property Taxonomy" sub="Configure locations, types, subtypes and filter flags for your agency" />
      <div style={{ padding: 24, color: 'var(--txt3)', fontSize: 13 }}>Loading…</div>
    </>
  }

  if (!tax) return null

  return (
    <>
      <Topbar
        title="Property Taxonomy"
        sub="Configure locations, types, subtypes and filter flags for your agency"
      />
      <div style={{ padding: '18px 24px 40px', maxWidth: 960 }}>
        {/* Presets */}
        <div style={{ ...cardStyle }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, gap: 12 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Country presets</div>
              <div style={{ fontSize: 12, color: 'var(--txt3)' }}>
                Apply a country preset as a starting point, then tweak anything below. Your clients can each run their own taxonomy.
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
            <div style={{ fontSize: 14, fontWeight: 700 }}>Country label</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 10 }}>
            Shown in filter dropdowns and the Add Property form (e.g. “All Cyprus”, “All Netherlands”).
          </div>
          <input
            value={tax.countryLabel}
            onChange={e => setTax({ ...tax, countryLabel: e.target.value })}
            style={{ ...inputStyle, width: 280 }}
          />
        </div>

        {/* Districts */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <MapPin size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Districts / Regions</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>{tax.districts.length} entries</span>
          </div>
          <OptionListEditor
            options={tax.districts}
            onChange={o => setTax({ ...tax, districts: o })}
            placeholder="e.g. Paphos"
          />
        </div>

        {/* Listing types */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Tag size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Listing types</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>
              Values must remain <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4 }}>sale</code> / <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4 }}>rent</code>
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 10 }}>
            Only the labels are translatable (e.g. “Te Koop” / “Te Huur”). Don&apos;t change the <code>value</code> column — the database uses it.
          </div>
          <OptionListEditor
            options={tax.listingTypes}
            onChange={o => setTax({ ...tax, listingTypes: o })}
            placeholder="e.g. For Sale"
          />
        </div>

        {/* Property types */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Home size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Top-level property types</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>{tax.propertyTypes.length} types</span>
          </div>
          <OptionListEditor
            options={tax.propertyTypes}
            onChange={o => setTax({ ...tax, propertyTypes: o })}
            placeholder="e.g. Houses"
          />
        </div>

        {/* Subtypes — one section per top-level type */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Tag size={15} />
            <div style={{ fontSize: 14, fontWeight: 700 }}>Subtypes by property type</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 14 }}>
            These appear as a cascading dropdown when the user picks a top-level type.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {typesList.length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--txt3)', fontStyle: 'italic' }}>
                Add at least one top-level property type above first.
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
                    placeholder={`Add ${pt.label} subtype`}
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
            <div style={{ fontSize: 14, fontWeight: 700 }}>Filter flags</div>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--txt3)' }}>
              Keys must be <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4 }}>isBankOwned</code> / <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4 }}>isResale</code>
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--txt3)', marginBottom: 10 }}>
            Only the label is editable. Delete a row to hide that checkbox from the filter bar.
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
                />
                <input
                  value={f.key}
                  readOnly
                  style={{ ...inputStyle, fontFamily: 'var(--font-red-hat-mono), monospace', fontSize: 11, opacity: 0.7 }}
                />
                <button
                  type="button"
                  onClick={() => setTax({ ...tax, flags: tax.flags.filter((_, j) => j !== i) })}
                  style={btnIconStyle}
                  title="Remove"
                ><Trash2 size={13} /></button>
              </div>
            ))}
            {tax.flags.length < 2 && (
              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                {!tax.flags.find(f => f.key === 'isBankOwned') && (
                  <button
                    type="button"
                    onClick={() => setTax({ ...tax, flags: [...tax.flags, { key: 'isBankOwned', label: 'Bank Owned Properties' }] })}
                    style={{ ...btnSecondary, padding: '6px 12px' }}
                  ><Plus size={13} /> Restore Bank Owned</button>
                )}
                {!tax.flags.find(f => f.key === 'isResale') && (
                  <button
                    type="button"
                    onClick={() => setTax({ ...tax, flags: [...tax.flags, { key: 'isResale', label: 'Resale Properties' }] })}
                    style={{ ...btnSecondary, padding: '6px 12px' }}
                  ><Plus size={13} /> Restore Resale</button>
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
            <Save size={14} /> {saving ? 'Saving…' : 'Save taxonomy'}
          </button>
        </div>
      </div>
    </>
  )
}
