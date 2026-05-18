import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, BarChart2, CheckCircle2, Download, Eye, EyeOff,
  Lock, Pencil, Plus, Save, Search, Settings, Trash2, User, Users
} from 'lucide-react';
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, query, setDoc
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';

const APP_ID = 'arte-encino-2026';
const ADMIN_PASSWORD = 'admin_encino_2026';

const GRADE_GROUPS = [
  { id: '3', label: '3º Grado' },
  { id: '4', label: '4º Grado' },
  { id: '5', label: '5º Grado' },
  { id: '6', label: '6º Grado' },
  { id: '7', label: '7º Grado' },
  { id: '8', label: '8º Grado' },
  { id: '9-10', label: '9º y 10º Grado' },
  { id: '11-12', label: '11º y 12º Grado' },
];
const GRADES = GRADE_GROUPS.map((g) => g.label);
const ALL_GRADES = GRADE_GROUPS.map((g) => g.id);
const DEFAULT_GRADE_CAPS = Object.fromEntries(ALL_GRADES.map((id) => [id, 10]));

const DEFAULT_WORKSHOPS = [
  {
    id: 'teatro',
    title: 'Teatro',
    emoji: '🎭',
    color: '#e11d48',
    desc: 'Expresión corporal, actuación y escena.',
    max: 10,
    active: true,
    gradeIds: ALL_GRADES,
    gradeCaps: DEFAULT_GRADE_CAPS,
    materials: ['Uniforme de teatro', 'Libretos del ciclo', 'Material afecta calificación'],
  },
  {
    id: 'guitarra',
    title: 'Guitarra',
    emoji: '🎸',
    color: '#ea580c',
    desc: 'Técnica, acordes y teoría musical.',
    max: 10,
    active: true,
    gradeIds: ALL_GRADES,
    gradeCaps: DEFAULT_GRADE_CAPS,
    materials: ['Guitarra con funda', 'Método de guitarra', 'Material afecta calificación'],
  },
  {
    id: 'violin',
    title: 'Violín',
    emoji: '🎻',
    color: '#b45309',
    desc: 'Lectura musical, postura y técnica de arco.',
    max: 10,
    active: true,
    gradeIds: ALL_GRADES,
    gradeCaps: DEFAULT_GRADE_CAPS,
    materials: ['Violín con estuche', 'Arco y brea', 'Material afecta calificación'],
  },
  {
    id: 'percusion',
    title: 'Percusión',
    emoji: '🥁',
    color: '#991b1b',
    desc: 'Ritmo, coordinación y ensamble musical.',
    max: 10,
    active: true,
    gradeIds: ALL_GRADES,
    gradeCaps: DEFAULT_GRADE_CAPS,
    materials: ['Baquetas personales', 'Libreta de música', 'Material afecta calificación'],
  },
  {
    id: 'teclado',
    title: 'Teclado',
    emoji: '🎹',
    color: '#2563eb',
    desc: 'Agilidad mental y destreza musical.',
    max: 10,
    active: true,
    gradeIds: ALL_GRADES,
    gradeCaps: DEFAULT_GRADE_CAPS,
    materials: ['Teclado personal', 'Método de teclado', 'Material afecta calificación'],
  },
  {
    id: 'artes-plasticas',
    title: 'Artes Plásticas',
    emoji: '🎨',
    color: '#059669',
    desc: 'Dibujo, pintura y escultura.',
    max: 10,
    active: true,
    gradeIds: ALL_GRADES,
    gradeCaps: DEFAULT_GRADE_CAPS,
    materials: ['Libreta de dibujo A4', 'Set de pinceles', 'Material afecta calificación'],
  },
];

const emptyWorkshop = {
  id: '',
  title: '',
  emoji: '✨',
  color: '#7c3aed',
  desc: '',
  max: 10,
  active: true,
  gradeIds: ALL_GRADES,
  gradeCaps: DEFAULT_GRADE_CAPS,
  materialsText: '',
};

function gradeId(label) {
  if (!label) return '';
  if (label.includes('9')) return '9-10';
  if (label.includes('11') || label.includes('12')) return '11-12';
  return label.replace('º Grado', '');
}

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function slugify(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || `taller-${Date.now()}`;
}

function normalizeWorkshop(id, data) {
  const rawGradeIds = Array.isArray(data.gradeIds) ? data.gradeIds : ALL_GRADES;
  const gradeIds = [...new Set(rawGradeIds.map((grade) => gradeId(String(grade))).filter(Boolean))]
    .filter((grade) => ALL_GRADES.includes(grade));
  const savedCaps = data.gradeCaps || {};
  const gradeCaps = {
    ...DEFAULT_GRADE_CAPS,
    ...Object.fromEntries(Object.entries(savedCaps).map(([grade, cap]) => [gradeId(String(grade)), cap])),
  };
  const max = gradeIds.reduce((sum, grade) => sum + Math.max(0, Number(gradeCaps[grade] || data.max || 10)), 0);
  return {
    id,
    title: data.title || 'Taller sin nombre',
    emoji: data.emoji || '✨',
    color: data.color || '#7c3aed',
    desc: data.desc || '',
    max,
    active: data.active !== false,
    gradeIds,
    gradeCaps,
    materials: Array.isArray(data.materials) ? data.materials : [],
  };
}

function mergeWorkshops(saved) {
  const merged = new Map(DEFAULT_WORKSHOPS.map((w) => [w.id, normalizeWorkshop(w.id, w)]));
  saved.forEach((w) => merged.set(w.id, normalizeWorkshop(w.id, w)));
  return Array.from(merged.values()).sort((a, b) => a.title.localeCompare(b.title, 'es'));
}

function getWorkshopHue(color) {
  return {
    '--workshop-color': color,
    '--workshop-soft': `${color}14`,
    '--workshop-line': `${color}33`,
  };
}

function countFor(registrations, id) {
  return registrations.filter((r) => r.workshopId === id).length;
}

function countForGroup(registrations, workshopId, groupId) {
  return registrations.filter((r) => r.workshopId === workshopId && gradeId(r.grade) === groupId).length;
}

function isAllowedForGrade(workshop, grade) {
  if (!grade) return true;
  return workshop.gradeIds.includes(gradeId(grade));
}

function capacityForGroup(workshop, grade) {
  const id = gradeId(grade);
  return Math.max(0, Number(workshop.gradeCaps?.[id] || 0));
}

function csvEscape(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function StudentView({ workshops, registrations, onGoAdmin }) {
  const activeWorkshops = workshops.filter((w) => w.active);
  const [selectedGrade, setSelectedGrade] = useState('');
  const [selected, setSelected] = useState(null);
  const [step, setStep] = useState('pick');
  const [form, setForm] = useState({ name: '', email: '' });
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const [lastReg, setLastReg] = useState(null);

  const visibleWorkshops = useMemo(() => {
    if (!selectedGrade) return activeWorkshops;
    return activeWorkshops.filter((w) => isAllowedForGrade(w, selectedGrade));
  }, [activeWorkshops, selectedGrade]);

  function availableFor(workshop) {
    if (!selectedGrade) return workshop.max - countFor(registrations, workshop.id);
    return capacityForGroup(workshop, selectedGrade) - countForGroup(registrations, workshop.id, gradeId(selectedGrade));
  }

  function chooseGrade(value) {
    setSelectedGrade(value);
    setSelected(null);
    setNotice('');
  }

  function chooseWorkshop(workshop) {
    if (!selectedGrade) {
      setNotice('Primero selecciona tu grado para mostrar talleres compatibles.');
      return;
    }
    if (!isAllowedForGrade(workshop, selectedGrade) || availableFor(workshop) <= 0) return;
    setSelected(workshop);
    setNotice('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selected || !selectedGrade || !form.name.trim() || !form.email.trim()) return;

    const normalizedEmail = form.email.trim().toLowerCase();
    const duplicate = registrations.some((r) =>
      r.workshopId === selected.id && String(r.userEmail || '').toLowerCase() === normalizedEmail
    );

    if (duplicate) {
      setNotice('Ese correo ya está inscrito en este taller.');
      return;
    }

    if (!isAllowedForGrade(selected, selectedGrade) || availableFor(selected) <= 0) {
      setNotice('Ese taller ya no está disponible para este grado.');
      setStep('pick');
      return;
    }

    setSubmitting(true);
    try {
      const data = {
        userName: form.name.trim(),
        userEmail: normalizedEmail,
        grade: selectedGrade,
        workshopId: selected.id,
        workshopTitle: selected.title,
        timestamp: new Date().toISOString(),
      };
      await addDoc(collection(db, 'artifacts', APP_ID, 'public', 'data', 'registrations'), data);
      setLastReg({ ...data, materials: selected.materials, color: selected.color });
      setStep('success');
    } catch (err) {
      console.error(err);
      setNotice('No se pudo registrar. Intenta de nuevo.');
    }
    setSubmitting(false);
  }

  if (step === 'success' && lastReg) {
    return (
      <div className="center-screen">
        <section className="success-card">
          <div className="success-icon"><CheckCircle2 size={40} /></div>
          <h2>Inscripción confirmada</h2>
          <p>
            Gracias <strong>{lastReg.userName}</strong>. Se registró tu lugar en
            {' '}<strong>{lastReg.workshopTitle}</strong>.
          </p>
          <div className="detail-box">
            <p className="eyebrow">Recuerda traer</p>
            {lastReg.materials.map((item, index) => (
              <div className="material-row" key={item}>
                {index === lastReg.materials.length - 1
                  ? <AlertTriangle size={15} />
                  : <CheckCircle2 size={15} style={{ color: lastReg.color }} />}
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button
            className="primary-button dark"
            onClick={() => {
              setStep('pick');
              setSelected(null);
              setSelectedGrade('');
              setForm({ name: '', email: '' });
              setNotice('');
            }}
          >
            Volver al inicio
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader onGoAdmin={onGoAdmin} />
      <main className="student-main">
        {step === 'pick' && (
          <>
            <section className="intro-block">
              <p className="eyebrow">Arte y Cultura Encino</p>
              <h2>Inscripciones 2026</h2>
              <p>Elige tu grado y toma uno de los lugares disponibles.</p>
            </section>

            <section className="grade-strip">
              <label>Grado escolar</label>
              <select value={selectedGrade} onChange={(e) => chooseGrade(e.target.value)}>
                <option value="">Selecciona grado...</option>
                {GRADES.map((grade) => <option key={grade} value={grade}>{grade}</option>)}
              </select>
            </section>

            {notice && <div className="notice">{notice}</div>}

            <section className="workshop-grid">
              {activeWorkshops.map((workshop) => {
                const available = availableFor(workshop);
                const allowed = isAllowedForGrade(workshop, selectedGrade);
                const disabled = !selectedGrade || !allowed || available <= 0;
                const selectedCard = selected?.id === workshop.id;
                return (
                  <button
                    key={workshop.id}
                    className={`workshop-card ${selectedCard ? 'selected' : ''}`}
                    style={getWorkshopHue(workshop.color)}
                    onClick={() => chooseWorkshop(workshop)}
                    disabled={disabled && selectedGrade !== ''}
                  >
                    <span className={`capacity-pill ${available <= 0 ? 'full' : available <= 3 ? 'low' : ''}`}>
                      {!selectedGrade ? 'Elige grado' : !allowed ? 'No aplica' : available <= 0 ? 'Lleno' : `${available} lugares`}
                    </span>
                    <span className="workshop-emoji">{workshop.emoji}</span>
                    <strong>{workshop.title}</strong>
                    <small>{workshop.desc}</small>
                  </button>
                );
              })}
            </section>

            {selected && (
              <section className="detail-box">
                <p className="eyebrow">Material necesario - {selected.title}</p>
                {selected.materials.map((item, index) => (
                  <div className="material-row" key={item}>
                    {index === selected.materials.length - 1
                      ? <AlertTriangle size={15} />
                      : <CheckCircle2 size={15} style={{ color: selected.color }} />}
                    <span>{item}</span>
                  </div>
                ))}
                <button
                  className="primary-button"
                  style={{ background: selected.color }}
                  onClick={() => setStep('form')}
                >
                  Inscribirme en {selected.title}
                </button>
              </section>
            )}

            {selectedGrade && visibleWorkshops.length === 0 && (
              <div className="empty-state">No hay talleres activos para este grado.</div>
            )}
          </>
        )}

        {step === 'form' && selected && (
          <section className="form-panel">
            <button className="text-button" onClick={() => setStep('pick')}>Cambiar taller</button>
            <div className="chosen-workshop" style={getWorkshopHue(selected.color)}>
              <span>{selected.emoji}</span>
              <div>
                <strong>{selected.title}</strong>
                <small>{selectedGrade} - {availableFor(selected)} lugares disponibles</small>
              </div>
            </div>

            {notice && <div className="notice">{notice}</div>}

            <form onSubmit={handleSubmit} className="clean-form">
              <label>
                Nombre completo del alumno
                <input
                  required
                  type="text"
                  placeholder="Ej. Maria Gonzalez"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </label>
              <label>
                Correo electrónico
                <input
                  required
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </label>
              <button
                className="primary-button"
                style={{ background: selected.color }}
                type="submit"
                disabled={submitting}
              >
                {submitting ? 'Guardando...' : 'Confirmar mi lugar'}
              </button>
            </form>
          </section>
        )}
      </main>
    </div>
  );
}

function AppHeader({ onGoAdmin }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <img src="/assets/arte-cultura-shield.png" alt="" />
        </span>
        <h1>Arte y Cultura <span>Encino</span></h1>
      </div>
      <button className="ghost-button" onClick={onGoAdmin}>
        <Settings size={14} /> Admin
      </button>
    </header>
  );
}

function AdminView({ workshops, registrations, onGoStudent }) {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');
  const [filterW, setFilterW] = useState('all');
  const [filterG, setFilterG] = useState('all');

  const filtered = registrations.filter((r) => {
    const matchesWorkshop = filterW === 'all' || r.workshopId === filterW;
    const matchesGrade = filterG === 'all' || r.grade === filterG;
    const text = `${r.userName || ''} ${r.userEmail || ''}`.toLowerCase();
    const matchesSearch = !search || text.includes(search.toLowerCase());
    return matchesWorkshop && matchesGrade && matchesSearch;
  });

  function exportCSV() {
    const rows = [
      ['Nombre', 'Grado', 'Taller', 'Email', 'Fecha'],
      ...registrations.map((r) => [r.userName, r.grade, r.workshopTitle, r.userEmail, fmtDate(r.timestamp)]),
    ];
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'Inscritos_Encino_2026.csv';
    a.click();
  }

  async function deleteReg(id) {
    if (!window.confirm('¿Eliminar este registro?')) return;
    await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'registrations', id));
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <img src="/assets/arte-cultura-shield.png" alt="" />
          </span>
          <h1>Arte y Cultura <span>Encino</span> <em>/ Admin</em></h1>
        </div>
        <div className="topbar-actions">
          <button className="success-button" onClick={exportCSV}><Download size={14} /> Exportar</button>
          <button className="ghost-button" onClick={onGoStudent}><User size={14} /> Alumno</button>
        </div>
      </header>

      <main className="admin-main">
        <nav className="tabs">
          {[
            ['overview', <BarChart2 size={14} />, 'Resumen'],
            ['students', <Users size={14} />, 'Alumnos'],
            ['workshops', <Settings size={14} />, 'Talleres'],
          ].map(([id, icon, label]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {icon}{label}
            </button>
          ))}
        </nav>

        {tab === 'overview' && <Overview workshops={workshops} registrations={registrations} />}

        {tab === 'students' && (
          <section>
            <div className="filters">
              <div className="search-field">
                <Search size={14} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar alumno..." />
              </div>
              <select value={filterW} onChange={(e) => setFilterW(e.target.value)}>
                <option value="all">Todos los talleres</option>
                {workshops.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
              <select value={filterG} onChange={(e) => setFilterG(e.target.value)}>
                <option value="all">Todos los grados</option>
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <span>{filtered.length} resultado{filtered.length === 1 ? '' : 's'}</span>
            </div>
            <StudentTable rows={filtered} workshops={workshops} onDelete={deleteReg} />
          </section>
        )}

        {tab === 'workshops' && <WorkshopManager workshops={workshops} registrations={registrations} />}
      </main>
    </div>
  );
}

function Overview({ workshops, registrations }) {
  const active = workshops.filter((w) => w.active);
  return (
    <section>
      <div className="metric-grid">
        {active.map((w) => {
          const count = countFor(registrations, w.id);
          const pct = Math.min(100, Math.round((count / w.max) * 100));
          return (
            <article className="metric-card" key={w.id} style={getWorkshopHue(w.color)}>
              <p>{w.title}</p>
              <strong>{count}</strong>
              <small>de {w.max} cupos</small>
              <div className="progress"><span style={{ width: `${pct}%` }} /></div>
            </article>
          );
        })}
      </div>

      <div className="overview-grid">
        <section className="panel">
          <h3>Inscritos por taller</h3>
          {active.map((w) => {
            const count = countFor(registrations, w.id);
            return (
              <div className="bar-row" key={w.id} style={getWorkshopHue(w.color)}>
                <div><span>{w.title}</span><strong>{count}</strong></div>
                <div className="progress"><span style={{ width: `${Math.min(100, (count / Math.max(w.max, 1)) * 100)}%` }} /></div>
              </div>
            );
          })}
        </section>

        <section className="panel">
          <h3>Estado general</h3>
          <div className="large-number">{registrations.length}</div>
          <p className="muted">alumnos inscritos</p>
          <div className="mini-list">
            <span>{active.length} talleres activos</span>
            <span>{workshops.length - active.length} ocultos</span>
          </div>
        </section>
      </div>
    </section>
  );
}

function StudentTable({ rows, workshops, onDelete }) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Alumno</th>
            <th>Grado</th>
            <th>Taller</th>
            <th>Fecha</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={5} className="empty-cell">Sin resultados</td></tr>
          )}
          {rows.map((r) => {
            const workshop = workshops.find((w) => w.id === r.workshopId);
            return (
              <tr key={r.id}>
                <td><strong>{r.userName}</strong><small>{r.userEmail}</small></td>
                <td>{r.grade}</td>
                <td><span className="tag" style={getWorkshopHue(workshop?.color || '#555')}>{r.workshopTitle}</span></td>
                <td>{fmtDate(r.timestamp)}</td>
                <td>
                  <button className="icon-danger" onClick={() => onDelete(r.id)} aria-label="Eliminar registro">
                    <Trash2 size={15} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function WorkshopManager({ workshops, registrations }) {
  const [editing, setEditing] = useState(null);

  function editWorkshop(workshop) {
    setEditing({
      ...workshop,
      materialsText: workshop.materials.join('\n'),
    });
  }

  async function toggleActive(workshop) {
    await saveWorkshop({ ...workshop, active: !workshop.active, materialsText: workshop.materials.join('\n') });
  }

  async function removeWorkshop(workshop) {
    const hasRegistrations = countFor(registrations, workshop.id) > 0;
    const message = hasRegistrations
      ? 'Este taller tiene alumnos inscritos. Se ocultará para nuevas inscripciones, pero conservará los registros. ¿Continuar?'
      : '¿Quitar este taller?';
    if (!window.confirm(message)) return;

    if (hasRegistrations || DEFAULT_WORKSHOPS.some((w) => w.id === workshop.id)) {
      await saveWorkshop({ ...workshop, active: false, materialsText: workshop.materials.join('\n') });
    } else {
      await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'workshops', workshop.id));
    }
  }

  async function saveWorkshop(form) {
    const id = form.id || slugify(form.title);
    const gradeIds = Array.isArray(form.gradeIds) ? form.gradeIds : ALL_GRADES;
    const gradeCaps = { ...DEFAULT_GRADE_CAPS, ...(form.gradeCaps || {}) };
    const payload = {
      title: form.title.trim(),
      emoji: form.emoji.trim() || '✨',
      color: form.color,
      desc: form.desc.trim(),
      max: gradeIds.reduce((sum, grade) => sum + Math.max(0, Number(gradeCaps[grade] || 0)), 0),
      active: form.active !== false,
      gradeIds,
      gradeCaps,
      materials: String(form.materialsText || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      updatedAt: new Date().toISOString(),
    };

    await setDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'workshops', id), payload);
    setEditing(null);
  }

  return (
    <section className="workshop-admin">
      <div className="section-head">
        <div>
          <h2>Talleres</h2>
          <p>Activa, oculta o limita talleres por grado desde este panel.</p>
        </div>
        <button className="primary-button compact dark" onClick={() => setEditing(emptyWorkshop)}>
          <Plus size={15} /> Nuevo taller
        </button>
      </div>

      {editing && (
        <WorkshopForm
          value={editing}
          onChange={setEditing}
          onCancel={() => setEditing(null)}
          onSave={saveWorkshop}
        />
      )}

      <div className="workshop-admin-grid">
        {workshops.map((w) => {
          const count = countFor(registrations, w.id);
          return (
            <article className={`admin-workshop-card ${!w.active ? 'inactive' : ''}`} key={w.id} style={getWorkshopHue(w.color)}>
              <div className="admin-card-title">
                <span>{w.emoji}</span>
                <div>
                  <strong>{w.title}</strong>
                  <small>{w.active ? 'Visible para alumnos' : 'Oculto'}</small>
                </div>
              </div>
              <p>{w.desc}</p>
              <div className="admin-card-meta">
                <span>{count}/{w.max} inscritos</span>
                <span>{w.gradeIds.length === ALL_GRADES.length ? 'Todos los grados' : `${w.gradeIds.length} grados`}</span>
              </div>
              <div className="admin-actions">
                <button onClick={() => editWorkshop(w)}><Pencil size={14} /> Editar</button>
                <button onClick={() => toggleActive(w)}>
                  {w.active ? <EyeOff size={14} /> : <Eye size={14} />}
                  {w.active ? 'Ocultar' : 'Mostrar'}
                </button>
                <button className="danger-text" onClick={() => removeWorkshop(w)}><Trash2 size={14} /> Quitar</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function WorkshopForm({ value, onChange, onCancel, onSave }) {
  function patch(next) {
    onChange({ ...value, ...next });
  }

  function toggleGrade(id) {
    const current = value.gradeIds || [];
    const next = current.includes(id) ? current.filter((g) => g !== id) : [...current, id];
    patch({ gradeIds: next });
  }

  function setGradeCapacity(id, amount) {
    patch({
      gradeCaps: {
        ...(value.gradeCaps || DEFAULT_GRADE_CAPS),
        [id]: Math.max(0, Number(amount || 0)),
      },
    });
  }

  function submit(e) {
    e.preventDefault();
    if (!value.title.trim()) return;
    onSave(value);
  }

  return (
    <form className="workshop-form" onSubmit={submit}>
      <div className="form-grid">
        <label>
          Nombre del taller
          <input value={value.title} onChange={(e) => patch({ title: e.target.value })} required />
        </label>
        <label>
          Emoji
          <input value={value.emoji} onChange={(e) => patch({ emoji: e.target.value })} maxLength={4} />
        </label>
        <label>
          Color
          <input type="color" value={value.color} onChange={(e) => patch({ color: e.target.value })} />
        </label>
      </div>

      <label>
        Descripción
        <input value={value.desc} onChange={(e) => patch({ desc: e.target.value })} />
      </label>

      <label>
        Materiales, uno por línea
        <textarea rows={4} value={value.materialsText} onChange={(e) => patch({ materialsText: e.target.value })} />
      </label>

      <div>
        <div className="inline-control">
          <strong>Grupos y cupos</strong>
          <button type="button" onClick={() => patch({ gradeIds: ALL_GRADES, gradeCaps: value.gradeCaps || DEFAULT_GRADE_CAPS })}>Todos</button>
          <button type="button" onClick={() => patch({ gradeIds: [] })}>Ninguno</button>
        </div>
        <div className="grade-cap-grid">
          {GRADES.map((grade) => {
            const id = gradeId(grade);
            const checked = value.gradeIds?.includes(id);
            return (
              <label className={checked ? 'checked' : ''} key={grade}>
                <input type="checkbox" checked={checked} onChange={() => toggleGrade(id)} />
                <span>{grade}</span>
                <input
                  type="number"
                  min="0"
                  value={(value.gradeCaps || DEFAULT_GRADE_CAPS)[id] || 0}
                  onChange={(e) => setGradeCapacity(id, e.target.value)}
                  disabled={!checked}
                />
              </label>
            );
          })}
        </div>
      </div>

      <label className="switch-row">
        <input type="checkbox" checked={value.active !== false} onChange={(e) => patch({ active: e.target.checked })} />
        Visible para alumnos
      </label>

      <div className="form-actions">
        <button type="button" className="ghost-button" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="primary-button compact"><Save size={15} /> Guardar taller</button>
      </div>
    </form>
  );
}

function AuthModal({ onSuccess, onClose }) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (pass === ADMIN_PASSWORD) onSuccess();
    else {
      setError(true);
      setPass('');
    }
  }

  return (
    <div className="modal-backdrop">
      <section className="auth-modal">
        <div className="auth-icon"><Lock size={24} /></div>
        <h3>Acceso Admin</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Contraseña"
            value={pass}
            onChange={(e) => {
              setPass(e.target.value);
              setError(false);
            }}
          />
          {error && <p>Contraseña incorrecta</p>}
          <div>
            <button type="button" onClick={onClose}>Cancelar</button>
            <button type="submit">Entrar</button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('student');
  const [showAuth, setShowAuth] = useState(false);
  const [registrations, setRegistrations] = useState([]);
  const [savedWorkshops, setSavedWorkshops] = useState([]);
  const [ready, setReady] = useState(false);

  const workshops = useMemo(() => mergeWorkshops(savedWorkshops), [savedWorkshops]);

  useEffect(() => {
    let stopRegs = null;
    let stopWorkshops = null;

    signInAnonymously(auth).catch(console.error);
    const stopAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;
      setReady(true);
      if (stopRegs) stopRegs();
      if (stopWorkshops) stopWorkshops();

      const regsQuery = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'registrations'));
      const workshopsQuery = query(collection(db, 'artifacts', APP_ID, 'public', 'data', 'workshops'));

      stopRegs = onSnapshot(regsQuery, (snap) => {
        const regs = [];
        snap.forEach((d) => regs.push({ id: d.id, ...d.data() }));
        regs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setRegistrations(regs);
      });

      stopWorkshops = onSnapshot(workshopsQuery, (snap) => {
        const items = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
        setSavedWorkshops(items);
      });
    });

    return () => {
      stopAuth();
      if (stopRegs) stopRegs();
      if (stopWorkshops) stopWorkshops();
    };
  }, []);

  if (!ready) {
    return (
      <div className="center-screen">
        <div className="loader">
          <img src="/assets/arte-cultura-shield.png" alt="" />
          <p>Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {view === 'student'
        ? <StudentView workshops={workshops} registrations={registrations} onGoAdmin={() => setShowAuth(true)} />
        : <AdminView workshops={workshops} registrations={registrations} onGoStudent={() => setView('student')} />}
      {showAuth && (
        <AuthModal
          onSuccess={() => {
            setView('admin');
            setShowAuth(false);
          }}
          onClose={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
