import { useEffect, useState } from 'react';
import axios from 'axios';
import {
  CalendarCheck, CheckCircle, DollarSign, PlusCircle,
  RefreshCw, Scissors, Users, XCircle
} from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000/api';

export default function App() {
  const [vista, setVista] = useState('AGENDA'); // AGENDA | WALKIN | COMISIONES
  const [citas, setCitas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [especialistas, setEspecialistas] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [comisiones, setComisiones] = useState([]);
  const [filtroSucursal, setFiltroSucursal] = useState('TODAS');

  // Formulario Walk-in (HU-04)
  const [walkNombre, setWalkNombre] = useState('');
  const [walkTel, setWalkTel] = useState('');
  const [walkCorreo, setWalkCorreo] = useState('walkin@barberclub.cl');
  const [walkSucursal, setWalkSucursal] = useState('');
  const [walkEspecialista, setWalkEspecialista] = useState('');
  const [walkServicio, setWalkServicio] = useState('');
  const [walkFecha, setWalkFecha] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    cargarTodo();
  }, []);

  const cargarTodo = async () => {
    try {
      const [rCit, rSuc, rEsp, rSer, rCom] = await Promise.all([
        axios.get(`${API_URL}/citas/`),
        axios.get(`${API_URL}/sucursales/`),
        axios.get(`${API_URL}/especialistas/`),
        axios.get(`${API_URL}/servicios/`),
        axios.get(`${API_URL}/comisiones/`),
      ]);
      setCitas(rCit.data);
      setSucursales(rSuc.data);
      setEspecialistas(rEsp.data);
      setServicios(rSer.data);
      setComisiones(rCom.data);

      if (rSuc.data.length > 0 && !walkSucursal) setWalkSucursal(rSuc.data[0].id);
      if (rEsp.data.length > 0 && !walkEspecialista) setWalkEspecialista(rEsp.data[0].id);
      if (rSer.data.length > 0 && !walkServicio) setWalkServicio(rSer.data[0].id);
    } catch (err) {
      console.error('Error cargando Backoffice:', err);
    }
  };

  const cambiarEstadoCita = async (id, accion) => {
    try {
      await axios.post(`${API_URL}/citas/${id}/${accion}/`);
      setAviso(`Cita #${id} actualizada (${accion}).`);
      cargarTodo();
    } catch (err) {
      console.error(err);
    }
  };

  // Cierre de atención y cálculo automático de comisión 1 a 1 (HU-02 / RF-06)
  const registrarAtencion = async (cita) => {
    const srv = servicios.find((s) => s.id === cita.servicio);
    const montoDefault = srv ? srv.precio : 18000;
    try {
      await axios.post(`${API_URL}/atenciones/`, {
        cita: cita.id,
        monto_cobrado: montoDefault,
        observacion: 'Servicio finalizado en salón',
      });
      setAviso(`Atención de Cita #${cita.id} cerrada ($${montoDefault.toLocaleString('es-CL')}) y comisión generada.`);
      cargarTodo();
    } catch (err) {
      setAviso('Esta cita ya fue cerrada anteriormente.');
    }
  };

  const handleCrearWalkIn = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/citas/`, {
        cliente_nombre: walkNombre,
        cliente_telefono: walkTel,
        cliente_correo: walkCorreo,
        sucursal: Number(walkSucursal),
        especialista: Number(walkEspecialista),
        servicio: Number(walkServicio),
        fecha_hora: new Date(walkFecha).toISOString(),
        es_walk_in: true,
        consentimiento_aceptado: true,
        version_politica: 'v1.0-walkin',
      });
      setAviso('Cliente presencial (Walk-In) ingresado en agenda.');
      setWalkNombre('');
      setWalkTel('');
      setVista('AGENDA');
      cargarTodo();
    } catch (err) {
      setAviso('Error: ese bloque horario ya está ocupado para ese especialista.');
    }
  };

  const citasFiltradas =
    filtroSucursal === 'TODAS'
      ? citas
      : citas.filter((c) => String(c.sucursal) === String(filtroSucursal));

  const totalComisiones = comisiones.reduce((acc, item) => acc + item.monto_comision, 0);

  return (
    <div>
      {/* Barra superior Backoffice */}
      <header className="topbar">
        <div className="brand">BARBER CLUB &amp; BEAUTY — BACKOFFICE OPERATIVO</div>
        <div className="role-tabs">
          <button
            className={`tab-btn ${vista === 'AGENDA' ? 'active' : ''}`}
            onClick={() => setVista('AGENDA')}
          >
            <CalendarCheck size={16} /> Agenda &amp; Recepción ({citas.length})
          </button>
          <button
            className={`tab-btn ${vista === 'WALKIN' ? 'active' : ''}`}
            onClick={() => setVista('WALKIN')}
          >
            <PlusCircle size={16} /> Ingreso Walk-In
          </button>
          <button
            className={`tab-btn ${vista === 'COMISIONES' ? 'active' : ''}`}
            onClick={() => setVista('COMISIONES')}
          >
            <DollarSign size={16} /> Comisiones Especialistas
          </button>
          <button className="tab-btn" onClick={cargarTodo} title="Sincronizar">
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      <main className="container">
        {aviso && (
          <div style={{ background: '#1e293b', border: '1px solid #eab32e', color: '#fde047', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.88rem' }}>
            {aviso}
          </div>
        )}

        {/* KPIs Operativos */}
        <section className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Reservas Registradas</div>
            <div className="kpi-value">{citas.length}</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Pendientes / Confirmadas</div>
            <div className="kpi-value" style={{ color: '#eab32e' }}>
              {citas.filter((c) => c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA').length}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Atenciones Cerradas</div>
            <div className="kpi-value" style={{ color: '#4ade80' }}>
              {citas.filter((c) => c.estado === 'ATENDIDA').length}
            </div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Comisiones Acumuladas</div>
            <div className="kpi-value" style={{ color: '#60a5fa' }}>
              ${totalComisiones.toLocaleString('es-CL')}
            </div>
          </div>
        </section>

        {/* VISTA 1: AGENDA Y GESTIÓN EN SALÓN */}
        {vista === 'AGENDA' && (
          <section className="panel">
            <div className="panel-header">
              <h2 style={{ fontSize: '1.15rem' }}>
                <Users size={18} style={{ display: 'inline', marginRight: '6px', color: '#eab32e' }} />
                Control de Citas Multisucursal
              </h2>
              <select
                value={filtroSucursal}
                onChange={(e) => setFiltroSucursal(e.target.value)}
                style={{ background: '#0b0c0e', color: '#fff', border: '1px solid #2e3340', padding: '0.45rem 0.75rem', borderRadius: '8px' }}
              >
                <option value="TODAS">Todas las Sucursales</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.comuna} — {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha / Hora</th>
                    <th>Cliente</th>
                    <th>Sucursal</th>
                    <th>Especialista</th>
                    <th>Servicio</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {citasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                        Aún no hay citas registradas. Agenda una desde http://localhost:5173 o en "Ingreso Walk-In".
                      </td>
                    </tr>
                  ) : (
                    citasFiltradas.map((c) => (
                      <tr key={c.id}>
                        <td>#{c.id}</td>
                        <td>{new Date(c.fecha_hora).toLocaleString('es-CL')}</td>
                        <td>
                          <strong>{c.cliente_nombre}</strong>
                          <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{c.cliente_telefono}</div>
                        </td>
                        <td>{c.sucursal_nombre}</td>
                        <td>{c.especialista_nombre}</td>
                        <td>{c.servicio_nombre} ({c.duracion_minutos}m)</td>
                        <td>
                          <span className={`badge badge-${c.estado}`}>{c.estado}</span>
                        </td>
                        <td style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {c.estado === 'PENDIENTE' && (
                            <button className="btn btn-blue" onClick={() => cambiarEstadoCita(c.id, 'confirmar')}>
                              <CheckCircle size={13} /> Confirmar
                            </button>
                          )}
                          {(c.estado === 'PENDIENTE' || c.estado === 'CONFIRMADA') && (
                            <>
                              <button className="btn btn-green" onClick={() => registrarAtencion(c)}>
                                <Scissors size={13} /> Cerrar Atención
                              </button>
                              <button className="btn btn-red" onClick={() => cambiarEstadoCita(c.id, 'cancelar')}>
                                <XCircle size={13} /> Cancelar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* VISTA 2: INGRESO PRESENCIAL WALK-IN (HU-04) */}
        {vista === 'WALKIN' && (
          <section className="panel">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: '#eab32e' }}>
              Registro Rápido de Cliente Presencial (Walk-In / Mostrador)
            </h2>
            <form onSubmit={handleCrearWalkIn}>
              <div className="form-grid">
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Nombre Cliente</label>
                  <input type="text" value={walkNombre} onChange={(e) => setWalkNombre(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Teléfono</label>
                  <input type="tel" value={walkTel} onChange={(e) => setWalkTel(e.target.value)} required />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Sucursal</label>
                  <select value={walkSucursal} onChange={(e) => setWalkSucursal(e.target.value)} required>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>{s.comuna} — {s.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Especialista</label>
                  <select value={walkEspecialista} onChange={(e) => setWalkEspecialista(e.target.value)} required>
                    {especialistas.map((e) => (
                      <option key={e.id} value={e.id}>{e.nombre_completo}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Servicio</label>
                  <select value={walkServicio} onChange={(e) => setWalkServicio(e.target.value)} required>
                    {servicios.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre} (${s.precio.toLocaleString('es-CL')})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#9ca3af' }}>Fecha y Hora</label>
                  <input type="datetime-local" value={walkFecha} onChange={(e) => setWalkFecha(e.target.value)} required />
                </div>
              </div>
              <button type="submit" className="btn btn-gold" style={{ padding: '0.65rem 1.25rem' }}>
                REGISTRAR EN AGENDA
              </button>
            </form>
          </section>
        )}

        {/* VISTA 3: COMISIONES AUTOMÁTICAS POR ESPECIALISTA (HU-02 / RF-06) */}
        {vista === 'COMISIONES' && (
          <section className="panel">
            <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem', color: '#eab32e' }}>
              Liquidación Automática de Comisiones (Trazabilidad 1 a 1)
            </h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID Comisión</th>
                    <th>Atención #</th>
                    <th>Especialista</th>
                    <th>% Aplicado</th>
                    <th>Monto Comisión</th>
                    <th>Fecha Cálculo</th>
                  </tr>
                </thead>
                <tbody>
                  {comisiones.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', color: '#9ca3af', padding: '2rem' }}>
                        Aún no hay comisiones generadas. Cierra una atención desde la pestaña "Agenda &amp; Recepción".
                      </td>
                    </tr>
                  ) : (
                    comisiones.map((com) => (
                      <tr key={com.id}>
                        <td>#{com.id}</td>
                        <td>Atención #{com.atencion}</td>
                        <td><strong>{com.especialista_nombre}</strong></td>
                        <td>{com.porcentaje_aplicado}%</td>
                        <td style={{ color: '#4ade80', fontWeight: 'bold' }}>
                          ${com.monto_comision.toLocaleString('es-CL')}
                        </td>
                        <td>{new Date(com.fecha_calculo).toLocaleString('es-CL')}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}