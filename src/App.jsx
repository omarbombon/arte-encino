import React, { useState, useEffect } from 'react';
import {
  Theater, Guitar, Piano, Palette, CheckCircle2,
  Settings, User, Lock, Trash2, Download,
  Search, AlertTriangle, BarChart2, Users, Target
} from 'lucide-react';
import {
  collection, addDoc, onSnapshot, query, deleteDoc, doc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

const APP_ID = 'arte-encino-2026';
const ADMIN_PASSWORD = 'admin_encino_2026';

const WORKSHOPS = [
  {
    id: 'teatro', title: 'Teatro', emoji: '🎭',
    icon: <Theater size={22} />,
    color: '#f43f5e', bg: '#fff1f2', textColor: '#9f1239',
    desc: 'Expresión corporal, actuación y escena.',
    max: 10,
    reqs: ['Uniforme de teatro', 'Libretos del ciclo', 'Material afecta calificación']
  },
  {
    id: 'guitarra', title: 'Guitarra', emoji: '🎸',
    icon: <Guitar size={22} />,
    color: '#f97316', bg: '#fff7ed', textColor: '#9a3412',
    desc: 'Técnica, acordes y teoría musical.',
    max: 10,
    reqs: ['Guitarra con funda', 'Método de guitarra', 'Material afecta calificación']
  },
  {
    id: 'teclado', title: 'Teclado', emoji: '🎹',
    icon: <Piano size={22} />,
    color: '#3b82f6', bg: '#eff6ff', textColor: '#1e3a8a',
    desc: 'Agilidad mental y destreza musical.',
    max: 10,
    reqs: ['Teclado personal', 'Método de teclado', 'Material afecta calificación']
  },
  {
    id: 'artes-plasticas', title: 'Artes Plásticas', emoji: '🎨',
    icon: <Palette size={22} />,
    color: '#10b981', bg: '#ecfdf5', textColor: '#064e3b',
    desc: 'Dibujo, pintura y escultura.',
    max: 10,
    reqs: ['Libreta de dibujo A4', 'Set de pinceles', 'Material afecta calificación']
  },
];

const GRADES = Array.from({ length: 12 }, (_, i) => `${i + 1}º Grado`);

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Student View ─────────────────────────────────────────────────────────────
function StudentView({ registrations, onGoAdmin }) {
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState('pick'); // pick | form | success
  const [form, setForm] = useState({ name: '', grade: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [lastReg, setLastReg] = useState(null);

  function countFor(id) { return registrations.filter(r => r.workshopId === id).length; }
  function availFor(w)  { return w.max - countFor(w.id); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.grade || !form.email) return;
    setSubmitting(true);
    try {
      const data = {
        userName: form.name,
        userEmail: form.email,
        grade: form.grade,
        workshopId: selected.id,
        workshopTitle: selected.title,
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'registrations'), data);
      setLastReg({ ...data, reqs: selected.reqs });
      setStep('success');
    } catch (err) {
      alert('Error al registrar. Intenta de nuevo.');
      console.error(err);
    }
    setSubmitting(false);
  }

  if (step === 'success' && lastReg) {
    const w = WORKSHOPS.find(w => w.id === lastReg.workshopId);
    return (
      <div style={{ minHeight: '100vh', background: '#f4f1ec', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ maxWidth: 440, width: '100%', background: '#fff', borderRadius: 24, border: '0.5px solid #e8e2d9', padding: '40px 36px', textAlign: 'center' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle2 size={40} color="#16a34a" />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>¡Inscripción confirmada!</h2>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
            Gracias <strong style={{ color: '#1a1a1a' }}>{lastReg.userName}</strong>. Enviamos el comprobante a <em>{lastReg.userEmail}</em>
          </p>
          <div style={{ background: '#faf8f5', borderRadius: 16, padding: '16px 20px', textAlign: 'left', marginBottom: 24, border: '0.5px solid #e8e2d9' }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#888', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10 }}>Recuerda traer</p>
            {lastReg.reqs.map((r, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: i < lastReg.reqs.length - 1 ? '0.5px solid #ede9e2' : 'none', fontSize: 13, color: '#555' }}>
                {i === lastReg.reqs.length - 1
                  ? <AlertTriangle size={15} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
                  : <CheckCircle2 size={15} color={w?.color || '#10b981'} style={{ flexShrink: 0, marginTop: 1 }} />}
                {r}
              </div>
            ))}
          </div>
          <button
            onClick={() => { setStep('pick'); setSelected(null); setForm({ name: '', grade: '', email: '' }); }}
            style={{ width: '100%', padding: '13px', borderRadius: 14, border: 'none', background: '#1a1a1a', color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f4f1ec' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '0.5px solid #e8e2d9', height: 60, padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#1a1a1a', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💡</div>
          <h1 style={{ fontSize: 16, fontWeight: 800, letterSpacing: '-.01em' }}>Arte y Cultura <span style={{ color: '#c084fc' }}>Encino</span></h1>
        </div>
        <button onClick={onGoAdmin} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '0.5px solid #e8e2d9', background: '#faf8f5', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#555' }}>
          <Settings size={14} /> Panel Control
        </button>
      </header>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '36px 24px' }}>
        {step === 'pick' && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <h2 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>Inscripciones 2026</h2>
              <p style={{ fontSize: 14, color: '#888' }}>Elige tu taller artístico para este ciclo escolar</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14, marginBottom: 24 }}>
              {WORKSHOPS.map(w => {
                const av = availFor(w);
                const sel = selected?.id === w.id;
                return (
                  <button
                    key={w.id}
                    onClick={() => setSelected(w)}
                    style={{
                      background: '#fff', borderRadius: 20, padding: 24, cursor: 'pointer', textAlign: 'left',
                      border: sel ? `2px solid ${w.color}` : '0.5px solid #e8e2d9',
                      transition: 'transform .18s, box-shadow .18s',
                      position: 'relative', overflow: 'hidden',
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <span style={{
                      position: 'absolute', top: 12, right: 12, fontSize: 10, fontWeight: 700,
                      padding: '3px 8px', borderRadius: 99,
                      background: av === 0 ? '#fee2e2' : av <= 3 ? '#fff7ed' : '#f0fdf4',
                      color: av === 0 ? '#991b1b' : av <= 3 ? '#9a3412' : '#14532d',
                    }}>
                      {av === 0 ? 'Lleno' : `${av} lugares`}
                    </span>
                    <div style={{ width: 48, height: 48, borderRadius: 13, background: w.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 12 }}>{w.emoji}</div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 800, marginBottom: 5 }}>{w.title}</div>
                    <div style={{ fontSize: 12, color: '#888', lineHeight: 1.4 }}>{w.desc}</div>
                  </button>
                );
              })}
            </div>

            {selected && (
              <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e8e2d9', padding: '18px 22px', marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: '#aaa', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10 }}>Material necesario — {selected.title}</p>
                {selected.reqs.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0', borderBottom: i < selected.reqs.length - 1 ? '0.5px solid #f0ede8' : 'none', fontSize: 13, color: '#555' }}>
                    {i === selected.reqs.length - 1
                      ? <AlertTriangle size={15} color="#f97316" style={{ flexShrink: 0, marginTop: 1 }} />
                      : <CheckCircle2 size={15} color={selected.color} style={{ flexShrink: 0, marginTop: 1 }} />}
                    {r}
                  </div>
                ))}
              </div>
            )}

            {selected && availFor(selected) > 0 && (
              <button
                onClick={() => setStep('form')}
                style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: selected.color, color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, cursor: 'pointer' }}
              >
                Inscribirse en {selected.title} →
              </button>
            )}
            {selected && availFor(selected) === 0 && (
              <div style={{ textAlign: 'center', padding: '14px', background: '#fee2e2', borderRadius: 14, color: '#991b1b', fontSize: 14, fontWeight: 600 }}>
                Este taller ya no tiene lugares disponibles.
              </div>
            )}
          </>
        )}

        {step === 'form' && selected && (
          <div>
            <button onClick={() => setStep('pick')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', fontSize: 13, color: '#888', cursor: 'pointer', marginBottom: 20, padding: 0 }}>
              ← Cambiar taller
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: selected.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{selected.emoji}</div>
              <div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 800 }}>{selected.title}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{availFor(selected)} lugares disponibles</div>
              </div>
            </div>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Nombre completo del alumno</label>
                <input
                  required type="text" placeholder="Ej. María González"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '0.5px solid #e8e2d9', background: '#faf8f5', fontSize: 14, outline: 'none' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Grado escolar</label>
                <select
                  required value={form.grade}
                  onChange={e => setForm({ ...form, grade: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '0.5px solid #e8e2d9', background: '#faf8f5', fontSize: 14, outline: 'none' }}
                >
                  <option value="">Selecciona grado…</option>
                  {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#888', marginBottom: 6 }}>Correo electrónico</label>
                <input
                  required type="email" placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '0.5px solid #e8e2d9', background: '#faf8f5', fontSize: 14, outline: 'none' }}
                />
              </div>
              <button
                type="submit" disabled={submitting}
                style={{ width: '100%', padding: 14, borderRadius: 14, border: 'none', background: selected.color, color: '#fff', fontFamily: 'Syne, sans-serif', fontSize: 15, fontWeight: 700, cursor: submitting ? 'not-allowed' : 'pointer', opacity: submitting ? 0.6 : 1, marginTop: 6 }}
              >
                {submitting ? 'Enviando…' : 'Confirmar mi lugar'}
              </button>
              <p style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}>Al confirmar, recibirás un comprobante por correo.</p>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Admin View ───────────────────────────────────────────────────────────────
function AdminView({ registrations, onGoStudent }) {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [filterW, setFilterW] = useState('all');
  const [filterG, setFilterG] = useState('all');
  const [viewMode, setViewMode] = useState('table');

  function countFor(id) { return registrations.filter(r => r.workshopId === id).length; }

  const filtered = registrations.filter(r => {
    const mW = filterW === 'all' || r.workshopId === filterW;
    const mG = filterG === 'all' || r.grade === filterG;
    const mS = !search || r.userName.toLowerCase().includes(search.toLowerCase()) || r.userEmail?.toLowerCase().includes(search.toLowerCase());
    return mW && mG && mS;
  });

  async function deleteReg(id) {
    if (!window.confirm('¿Eliminar este registro?')) return;
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'registrations', id));
  }

  function exportCSV() {
    const rows = [
      ['Nombre', 'Grado', 'Taller', 'Email', 'Fecha'],
      ...registrations.map(r => [r.userName, r.grade, r.workshopTitle, r.userEmail, fmtDate(r.timestamp)])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'Inscritos_Encino_2026.csv';
    a.click();
  }

  const tabStyle = (t) => ({
    padding: '7px 16px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: 'none',
    background: tab === t ? '#1a1a1a' : 'transparent',
    color: tab === t ? '#fff' : '#888',
    transition: 'all .15s',
  });

  return (
    <div style={{ minHeight: '100vh', background: '#f4f1ec' }}>
      {/* Header */}
      <header style={{ background: '#fff', borderBottom: '0.5px solid #e8e2d9', height: 60, padding: '0 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: '#1a1a1a', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💡</div>
          <h1 style={{ fontSize: 16, fontWeight: 800 }}>Arte y Cultura <span style={{ color: '#c084fc' }}>Encino</span> <span style={{ color: '#aaa', fontWeight: 400 }}>/ Admin</span></h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportCSV} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: 'none', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            <Download size={14} /> Exportar CSV
          </button>
          <button onClick={onGoStudent} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 10, border: '0.5px solid #e8e2d9', background: '#faf8f5', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#555' }}>
            <User size={14} /> Vista Alumno
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 5, borderRadius: 13, border: '0.5px solid #e8e2d9', width: 'fit-content', marginBottom: 28 }}>
          <button style={tabStyle('overview')} onClick={() => setTab('overview')}><BarChart2 size={13} style={{ display: 'inline', marginRight: 5 }} />Resumen</button>
          <button style={tabStyle('students')} onClick={() => setTab('students')}><Users size={13} style={{ display: 'inline', marginRight: 5 }} />Alumnos</button>
          <button style={tabStyle('capacity')} onClick={() => setTab('capacity')}><Target size={13} style={{ display: 'inline', marginRight: 5 }} />Cupos</button>
        </div>

        {/* Overview Tab */}
        {tab === 'overview' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
              {WORKSHOPS.map(w => {
                const cnt = countFor(w.id);
                const pct = Math.round((cnt / w.max) * 100);
                return (
                  <div key={w.id} style={{ background: w.bg, borderRadius: 18, padding: '18px 22px', border: `0.5px solid ${w.color}22` }}>
                    <p style={{ fontSize: 11, fontWeight: 800, color: w.color, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 8 }}>{w.title}</p>
                    <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{cnt}</p>
                    <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>de {w.max} cupos</p>
                    <div style={{ height: 5, background: '#e8e2d9', borderRadius: 99, marginTop: 12, overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 99, background: w.color, width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 20 }}>
              <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e8e2d9', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 20 }}>Inscritos por taller</h3>
                {WORKSHOPS.map(w => {
                  const cnt = countFor(w.id);
                  const max = Math.max(...WORKSHOPS.map(x => countFor(x.id)), 1);
                  return (
                    <div key={w.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 600 }}>{w.title}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: w.color }}>{cnt}</span>
                      </div>
                      <div style={{ height: 8, background: '#f0ede8', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: 99, background: w.color, width: `${Math.round((cnt / max) * 100)}%`, transition: 'width .6s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e8e2d9', padding: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 16 }}>Última inscripción</h3>
                {registrations.length > 0 ? (() => {
                  const last = registrations[registrations.length - 1];
                  const w = WORKSHOPS.find(x => x.id === last.workshopId);
                  return (
                    <div>
                      <p style={{ fontSize: 15, fontWeight: 700 }}>{last.userName}</p>
                      <p style={{ fontSize: 12, color: '#888', marginBottom: 10 }}>{last.userEmail}</p>
                      <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: w?.bg, color: w?.color }}>{last.workshopTitle}</span>
                      <p style={{ fontSize: 11, color: '#aaa', marginTop: 10 }}>{fmtDate(last.timestamp)}</p>
                    </div>
                  );
                })() : <p style={{ fontSize: 13, color: '#aaa' }}>Sin registros aún.</p>}
                <div style={{ marginTop: 20, paddingTop: 16, borderTop: '0.5px solid #f0ede8' }}>
                  <p style={{ fontSize: 11, color: '#aaa', marginBottom: 4 }}>TOTAL</p>
                  <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 28, fontWeight: 800 }}>{registrations.length}</p>
                  <p style={{ fontSize: 12, color: '#888' }}>alumnos inscritos</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Students Tab */}
        {tab === 'students' && (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#aaa' }} />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Buscar alumno…"
                  style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '0.5px solid #e8e2d9', background: '#fff', fontSize: 13, outline: 'none' }}
                />
              </div>
              <select value={filterW} onChange={e => setFilterW(e.target.value)} style={{ padding: '9px 14px', borderRadius: 10, border: '0.5px solid #e8e2d9', background: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                <option value="all">Todos los talleres</option>
                {WORKSHOPS.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
              <select value={filterG} onChange={e => setFilterG(e.target.value)} style={{ padding: '9px 14px', borderRadius: 10, border: '0.5px solid #e8e2d9', background: '#fff', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                <option value="all">Todos los grados</option>
                {GRADES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 3, background: '#fff', border: '0.5px solid #e8e2d9', borderRadius: 10, padding: 3 }}>
                {['table', 'cards'].map(v => (
                  <button key={v} onClick={() => setViewMode(v)} style={{ padding: '5px 10px', borderRadius: 7, border: 'none', cursor: 'pointer', background: viewMode === v ? '#1a1a1a' : 'transparent', color: viewMode === v ? '#fff' : '#888', fontSize: 12, fontWeight: 600 }}>
                    {v === 'table' ? '≡ Tabla' : '⊞ Cards'}
                  </button>
                ))}
              </div>
              <span style={{ fontSize: 12, color: '#aaa', fontWeight: 600 }}>{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</span>
            </div>

            {viewMode === 'table' ? (
              <div style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e8e2d9', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#faf8f5', borderBottom: '0.5px solid #e8e2d9' }}>
                      {['Alumno', 'Grado', 'Taller', 'Fecha', ''].map(h => (
                        <th key={h} style={{ padding: '13px 20px', textAlign: 'left', fontSize: 11, fontWeight: 800, color: '#aaa', letterSpacing: '.05em', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14 }}>Sin resultados</td></tr>
                    )}
                    {filtered.map(r => {
                      const w = WORKSHOPS.find(x => x.id === r.workshopId);
                      return (
                        <tr key={r.id} style={{ borderBottom: '0.5px solid #f0ede8' }}>
                          <td style={{ padding: '13px 20px' }}>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{r.userName}</div>
                            <div style={{ fontSize: 11, color: '#aaa' }}>{r.userEmail}</div>
                          </td>
                          <td style={{ padding: '13px 20px', fontSize: 12, color: '#555' }}>{r.grade}</td>
                          <td style={{ padding: '13px 20px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 700, background: w?.bg, color: w?.color }}>{r.workshopTitle}</span>
                          </td>
                          <td style={{ padding: '13px 20px', fontSize: 12, color: '#aaa' }}>{fmtDate(r.timestamp)}</td>
                          <td style={{ padding: '13px 20px' }}>
                            <button onClick={() => deleteReg(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#f43f5e', padding: '5px', borderRadius: 7 }}>
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                {filtered.length === 0 && <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14, gridColumn: '1/-1' }}>Sin resultados</div>}
                {filtered.map(r => {
                  const w = WORKSHOPS.find(x => x.id === r.workshopId);
                  return (
                    <div key={r.id} style={{ background: '#fff', borderRadius: 16, border: '0.5px solid #e8e2d9', padding: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: w?.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{w?.emoji}</div>
                        <button onClick={() => deleteReg(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ddd', padding: 3 }}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{r.userName}</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 10 }}>{r.userEmail}</div>
                      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: w?.bg, color: w?.color }}>{r.workshopTitle}</span>
                        <span style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: 700, background: '#f4f1ec', color: '#888' }}>{r.grade}</span>
                      </div>
                      <div style={{ fontSize: 10, color: '#ccc', marginTop: 10 }}>{fmtDate(r.timestamp)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Capacity Tab */}
        {tab === 'capacity' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
            {WORKSHOPS.map(w => {
              const cnt = countFor(w.id);
              const pct = Math.round((cnt / w.max) * 100);
              const available = w.max - cnt;
              const byGrade = {};
              registrations.filter(r => r.workshopId === w.id).forEach(r => { byGrade[r.grade] = (byGrade[r.grade] || 0) + 1; });
              return (
                <div key={w.id} style={{ background: '#fff', borderRadius: 18, border: '0.5px solid #e8e2d9', padding: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <div>
                      <p style={{ fontSize: 11, fontWeight: 800, color: w.color, letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 4 }}>{w.title}</p>
                      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800 }}>{cnt} <span style={{ fontSize: 14, color: '#aaa', fontWeight: 400 }}>/ {w.max}</span></p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 26, fontWeight: 800, color: available === 0 ? '#f43f5e' : available <= 3 ? '#f97316' : '#10b981' }}>{available}</p>
                      <p style={{ fontSize: 11, color: '#aaa' }}>lugares libres</p>
                    </div>
                  </div>
                  <div style={{ height: 6, background: '#f0ede8', borderRadius: 99, overflow: 'hidden', marginBottom: 20 }}>
                    <div style={{ height: '100%', borderRadius: 99, background: pct >= 90 ? '#f43f5e' : pct >= 70 ? '#f97316' : w.color, width: `${pct}%` }} />
                  </div>
                  {Object.keys(byGrade).length > 0 ? (
                    <>
                      <p style={{ fontSize: 11, fontWeight: 800, color: '#aaa', letterSpacing: '.05em', textTransform: 'uppercase', marginBottom: 10 }}>Por grado</p>
                      {Object.entries(byGrade).sort((a, b) => a[0].localeCompare(b[0])).map(([grade, n]) => (
                        <div key={grade} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                          <span style={{ fontSize: 12, color: '#555' }}>{grade}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 3 }}>
                              {Array.from({ length: n }).map((_, i) => (
                                <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: w.color }} />
                              ))}
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700 }}>{n}</span>
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p style={{ fontSize: 12, color: '#ccc', textAlign: 'center', padding: '10px 0' }}>Sin inscritos aún</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

// ─── Auth Modal ───────────────────────────────────────────────────────────────
function AuthModal({ onSuccess, onClose }) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (pass === ADMIN_PASSWORD) { onSuccess(); }
    else { setError(true); setPass(''); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: '36px 32px', width: '100%', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, background: '#f4f1ec', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Lock size={24} color="#555" />
        </div>
        <h3 style={{ fontFamily: 'Syne, sans-serif', fontSize: 20, fontWeight: 800, marginBottom: 20 }}>Acceso Admin</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="password" placeholder="Contraseña" value={pass}
            onChange={e => { setPass(e.target.value); setError(false); }}
            style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: `0.5px solid ${error ? '#f43f5e' : '#e8e2d9'}`, background: '#faf8f5', fontSize: 14, outline: 'none', textAlign: 'center', marginBottom: 6 }}
          />
          {error && <p style={{ fontSize: 12, color: '#f43f5e', marginBottom: 10 }}>Contraseña incorrecta</p>}
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="button" onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 11, border: '0.5px solid #e8e2d9', background: '#faf8f5', fontSize: 13, fontWeight: 600, cursor: 'pointer', color: '#555' }}>Cancelar</button>
            <button type="submit" style={{ flex: 1, padding: 12, borderRadius: 11, border: 'none', background: '#1a1a1a', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Syne, sans-serif' }}>Entrar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState('student');
  const [showAuth, setShowAuth] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    signInAnonymously(auth).catch(console.error);
    return onAuthStateChanged(auth, user => {
      if (!user) return;
      setReady(true);
      const q = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'registrations'));
      return onSnapshot(q, snap => {
        const regs = [];
        snap.forEach(d => regs.push({ id: d.id, ...d.data() }));
        setRegistrations(regs);
      });
    });
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4f1ec' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💡</div>
          <p style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700, color: '#888' }}>Cargando…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'student'
        ? <StudentView registrations={registrations} onGoAdmin={() => setShowAuth(true)} />
        : <AdminView registrations={registrations} onGoStudent={() => setView('student')} />
      }
      {showAuth && (
        <AuthModal
          onSuccess={() => { setView('admin'); setShowAuth(false); }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
