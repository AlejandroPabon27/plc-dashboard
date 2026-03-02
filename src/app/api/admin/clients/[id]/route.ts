// =============================================================================
// src/app/api/admin/clients/[id]/route.ts — PUT + DELETE cliente por ID
// Consulta tabla: clients (DB QNAP)
//
// PROPÓSITO: Endpoints de administración para actualizar y eliminar un cliente
// OPC-UA específico identificado por su ID.
//
// CONSUMIDO POR: ClientsTab en src/app/admin/page.tsx
//
// ENDPOINTS:
// - PUT    /api/admin/clients/[id] → actualiza nombre, URL y IP del cliente
//   Body: { name: string, server_url: string, server_ip: string }
//   Respuesta: el cliente actualizado (o 404 si no existe)
//
// - DELETE /api/admin/clients/[id] → elimina el cliente Y todos sus nodos asociados
//   Primero elimina los nodos de node_ids (cascade manual), luego el cliente.
//   Esto es necesario porque la DB puede no tener ON DELETE CASCADE configurado.
//
// PARA MODIFICAR:
// - Agregar campos editables → editar el UPDATE SET
// - Cambiar lógica de cascade → editar el DELETE en el handler DELETE
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * PUT /api/admin/clients/[id] — Actualiza nombre, URL y IP de un cliente existente.
 * Retorna 404 si el cliente no existe.
 *
 * @param req - Request con body JSON { name, server_url, server_ip }
 * @param context - Contiene params.id con el ID del cliente a actualizar
 * @returns El cliente actualizado o error 404
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (USE_MOCK) return NextResponse.json({ message: 'Mock: cliente actualizado' });
    try {
        const { id } = await params;
        const { name, server_url, server_ip } = await req.json();
        if (!name || !server_url || !server_ip) return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        const { rows } = await query(
            'UPDATE clients SET name=$1, server_url=$2, server_ip=$3 WHERE id=$4 RETURNING *',
            [name, server_url, server_ip, id], 10000, 'admin-client-update'
        );
        if (!rows.length) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 });
        return NextResponse.json(rows[0]);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/clients/[id] — Elimina un cliente y todos sus nodos asociados.
 * Ejecuta cascade manual: primero elimina nodos de node_ids, luego el cliente.
 * No elimina logs huérfanos que referencien esos nodos.
 *
 * @param _ - Request (no utilizado)
 * @param context - Contiene params.id con el ID del cliente a eliminar
 * @returns Mensaje de confirmación
 */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (USE_MOCK) return NextResponse.json({ message: 'Mock: cliente eliminado' });
    try {
        const { id } = await params;
        // Eliminar nodos asociados primero (cascade manual)
        await query('DELETE FROM node_ids WHERE client_id=$1', [id], 10000, 'admin-client-delete-nodos');
        await query('DELETE FROM clients WHERE id=$1', [id], 10000, 'admin-client-delete');
        return NextResponse.json({ message: 'Cliente y nodos eliminados' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
