// =============================================================================
// src/app/admin/page.tsx — Administración de clientes y nodos (CRUD)
// Campos mapeados a la DB QNAP (clients, node_ids)
//
// PROPÓSITO: Página /admin con dos tabs para administrar:
// 1. ClientsTab → CRUD de clientes OPC-UA (name, server_url, server_ip)
// 2. NodosTab → CRUD de nodos OPC-UA (node_id, tag_name, tag_group, is_alarm)
//
// LAYOUT DE LA PÁGINA:
// └─ AppShell
//    ├─ Header (título "Administración")
//    └─ Card con Tabs
//       ├─ Tab "Clientes" → <ClientsTab />
//       └─ Tab "Nodos OPC-UA" → <NodosTab />
//
// COMPONENTES INTERNOS:
// - ClientsTab: lista clientes con botón nuevo/editar/eliminar + modal de formulario
//   APIs: GET/POST /api/admin/clients, PUT/DELETE /api/admin/clients/[id]
//
// - NodosTab: lista nodos con botón nuevo/editar/eliminar + modal de formulario
//   APIs: GET/POST /api/admin/nodos, PUT/DELETE /api/admin/nodos/[id]
//   Carga clientes desde /api/clients para el selector de cliente al crear nodo
//
// PARA MODIFICAR:
// - Agregar nueva tab (ej: configuraciones) → añadir TabsTrigger + TabsContent
// - Agregar campos al formulario de cliente → editar el Dialog de ClientsTab
// - Agregar campos al formulario de nodo → editar el Dialog de NodosTab
// - Cambiar estilo de las tarjetas → editar los divs con className rounded-lg
// =============================================================================
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Settings, Plus, Pencil, Trash2, Loader2, Network, Cpu, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { Cliente, Nodo } from '@/types';

/**
 * Tab de administración de clientes OPC-UA.
 * Carga la lista desde GET /api/admin/clients.
 * Permite crear (POST), editar (PUT) y eliminar (DELETE) clientes
 * usando un modal con formulario de nombre, URL y IP.
 * La eliminación incluye cascade de nodos asociados.
 */
function ClientsTab() {
    const [clients, setClients] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Cliente | null>(null);
    const [form, setForm] = useState({ name: '', server_url: '', server_ip: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const data = await fetch('/api/admin/clients').then(r => r.json());
        setClients(data);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openNew = () => { setEditing(null); setForm({ name: '', server_url: '', server_ip: '' }); setModalOpen(true); };
    const openEdit = (c: Cliente) => { setEditing(c); setForm({ name: c.name, server_url: c.server_url, server_ip: c.server_ip }); setModalOpen(true); };

    const handleSave = async () => {
        if (!form.name || !form.server_url || !form.server_ip) return toast.error('Completa todos los campos');
        setSaving(true);
        try {
            const url = editing ? `/api/admin/clients/${editing.id}` : '/api/admin/clients';
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(editing ? 'Cliente actualizado' : 'Cliente creado');
            setModalOpen(false);
            load();
        } catch (err: any) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar este cliente y todos sus nodos?')) return;
        await fetch(`/api/admin/clients/${id}`, { method: 'DELETE' });
        toast.success('Cliente eliminado');
        load();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" className="gap-1.5 h-8" onClick={openNew} id="add-client-btn">
                    <Plus className="w-3.5 h-3.5" /> Nuevo cliente
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="space-y-2">
                    {clients.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                            <Inbox className="w-8 h-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No hay clientes registrados</p>
                            <p className="text-xs text-muted-foreground/60">Haz clic en "Nuevo cliente" para agregar uno</p>
                        </div>
                    ) : clients.map(c => (
                        <div key={c.id} className="flex items-center gap-3 p-3.5 rounded-lg bg-card border border-border hover:border-border/70 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <Network className="w-4 h-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium">{c.name}</p>
                                <p className="text-xs text-muted-foreground font-mono truncate">{c.server_url}</p>
                                <p className="text-xs text-muted-foreground">IP: {c.server_ip}</p>
                            </div>
                            <Badge variant="secondary" className="text-xs">{c.id}</Badge>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(c)} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(c.id)} aria-label="Eliminar"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle>{editing ? 'Editar cliente' : 'Nuevo cliente'}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <div><Label className="text-xs">Nombre</Label>
                            <Input id="client-name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Bomba Principal CY-01" className="mt-1" />
                        </div>
                        <div><Label className="text-xs">Server URL (OPC-UA)</Label>
                            <Input id="client-url" value={form.server_url} onChange={e => setForm(f => ({ ...f, server_url: e.target.value }))} placeholder="opc.tcp://192.168.1.10:4840" className="mt-1 font-mono text-sm" />
                        </div>
                        <div><Label className="text-xs">Server IP</Label>
                            <Input id="client-ip" value={form.server_ip} onChange={e => setForm(f => ({ ...f, server_ip: e.target.value }))} placeholder="192.168.1.10" className="mt-1 font-mono text-sm" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                            {editing ? 'Guardar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

/**
 * Tab de administración de nodos OPC-UA.
 * Carga nodos desde GET /api/admin/nodos y clientes desde /api/clients.
 * Permite crear (POST), editar (PUT) y eliminar (DELETE) nodos.
 * El formulario incluye selector de cliente, node_id, tag_name, tag_group
 * y checkbox is_alarm.
 */
function NodosTab() {
    const [nodos, setNodos] = useState<Nodo[]>([]);
    const [clients, setClients] = useState<Cliente[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState<Nodo | null>(null);
    const [form, setForm] = useState({ client_id: '', node_id: '', tag_name: '', tag_group: '', is_alarm: false });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const [n, c] = await Promise.all([
            fetch('/api/admin/nodos').then(r => r.json()),
            fetch('/api/clients').then(r => r.json()),
        ]);
        setNodos(n); setClients(c); setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const openNew = () => {
        setEditing(null);
        setForm({ client_id: '', node_id: '', tag_name: '', tag_group: '', is_alarm: false });
        setModalOpen(true);
    };

    const openEdit = (n: Nodo) => {
        setEditing(n);
        setForm({
            client_id: String(n.client_id),
            node_id: n.node_id,
            tag_name: n.tag_name,
            tag_group: n.tag_group,
            is_alarm: n.is_alarm,
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.client_id || !form.node_id || !form.tag_name || !form.tag_group)
            return toast.error('Completa todos los campos');
        setSaving(true);
        try {
            const url = editing ? `/api/admin/nodos/${editing.id}` : '/api/admin/nodos';
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method, headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...form, client_id: parseInt(form.client_id) }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            toast.success(editing ? 'Nodo actualizado' : 'Nodo creado');
            setModalOpen(false);
            load();
        } catch (err: any) { toast.error(err.message); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('¿Eliminar este nodo?')) return;
        await fetch(`/api/admin/nodos/${id}`, { method: 'DELETE' });
        toast.success('Nodo eliminado');
        load();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Button size="sm" className="gap-1.5 h-8" onClick={openNew} id="add-nodo-btn">
                    <Plus className="w-3.5 h-3.5" /> Nuevo nodo
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="space-y-2">
                    {nodos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center gap-2">
                            <Inbox className="w-8 h-8 text-muted-foreground/40" />
                            <p className="text-sm text-muted-foreground">No hay nodos registrados</p>
                            <p className="text-xs text-muted-foreground/60">Haz clic en "Nuevo nodo" para agregar uno</p>
                        </div>
                    ) : nodos.map(n => (
                        <div key={n.id} className="flex items-center gap-3 p-3.5 rounded-lg bg-card border border-border hover:border-border/70 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0">
                                <Cpu className="w-4 h-4 text-violet-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium">{n.tag_name}</p>
                                    <Badge variant="outline" className="text-xs">{n.tag_group}</Badge>
                                    {n.is_alarm && <Badge variant="destructive" className="text-xs">Alarma</Badge>}
                                </div>
                                <p className="text-xs text-muted-foreground font-mono truncate">{n.node_id}</p>
                                <p className="text-xs text-muted-foreground">{n.client_name}</p>
                            </div>
                            <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(n)} aria-label="Editar"><Pencil className="w-3.5 h-3.5" /></Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => handleDelete(n.id)} aria-label="Eliminar"><Trash2 className="w-3.5 h-3.5" /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="bg-card border-border">
                    <DialogHeader><DialogTitle>{editing ? 'Editar nodo' : 'Nuevo nodo OPC-UA'}</DialogTitle></DialogHeader>
                    <div className="space-y-3">
                        <div><Label className="text-xs">Cliente</Label>
                            <Select value={form.client_id} onValueChange={v => setForm(f => ({ ...f, client_id: v }))}>
                                <SelectTrigger className="w-full mt-1" id="nodo-client">
                                    <SelectValue placeholder="Seleccionar cliente..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div><Label className="text-xs">Node ID (OPC-UA)</Label>
                            <Input id="nodo-nodeid" value={form.node_id} onChange={e => setForm(f => ({ ...f, node_id: e.target.value }))} placeholder="ns=2;s=Bomba.Presion.Entrada" className="mt-1 font-mono text-sm" />
                        </div>
                        <div><Label className="text-xs">Tag Name</Label>
                            <Input id="nodo-tagname" value={form.tag_name} onChange={e => setForm(f => ({ ...f, tag_name: e.target.value }))} placeholder="Presión Entrada" className="mt-1" />
                        </div>
                        <div><Label className="text-xs">Tag Group</Label>
                            <Input id="nodo-taggroup" value={form.tag_group} onChange={e => setForm(f => ({ ...f, tag_group: e.target.value }))} placeholder="Presión, Temperatura, Caudal…" className="mt-1" />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="nodo-alarm" className="text-xs">Es alarma</Label>
                            <Switch id="nodo-alarm" checked={form.is_alarm} onCheckedChange={v => setForm(f => ({ ...f, is_alarm: v }))} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving}>
                            {saving && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                            {editing ? 'Guardar' : 'Crear nodo'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
/**
 * Página de administración con tabs para Clientes y Nodos OPC-UA.
 * Cada tab maneja su propio estado de carga, modales y CRUD de forma independiente.
 */// ── Página principal Admin ────────────────────────────────────────────────────
export default function AdminPage() {
    return (
        <AppShell>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                    <h1 className="text-xl font-bold">Administración</h1>
                    <p className="text-xs text-muted-foreground">Gestión de clientes OPC-UA y nodos monitoreados</p>
                </div>
            </div>

            <Card className="glass border-border/40">
                <CardContent className="p-0">
                    <Tabs defaultValue="clients" className="w-full">
                        <TabsList className="w-full rounded-b-none border-b border-border bg-muted/20 px-4 pt-2 pb-0 gap-2">
                            <TabsTrigger value="clients" className="gap-1.5 data-[state=active]:bg-background" id="tab-clients">
                                <Network className="w-3.5 h-3.5" /> Clientes
                            </TabsTrigger>
                            <TabsTrigger value="nodos" className="gap-1.5 data-[state=active]:bg-background" id="tab-nodos">
                                <Cpu className="w-3.5 h-3.5" /> Nodos OPC-UA
                            </TabsTrigger>
                        </TabsList>
                        <div className="p-4">
                            <TabsContent value="clients"><ClientsTab /></TabsContent>
                            <TabsContent value="nodos"><NodosTab /></TabsContent>
                        </div>
                    </Tabs>
                </CardContent>
            </Card>
        </AppShell>
    );
}
