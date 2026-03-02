// =============================================================================
// src/app/api/admin/nodos/[id]/route.ts — PUT + DELETE nodo por ID
// Consulta tabla: node_ids (DB QNAP)
//
// PROPÓSITO: Endpoints de administración para actualizar y eliminar un nodo
// OPC-UA específico identificado por su ID en la tabla node_ids.
//
// CONSUMIDO POR: NodosTab en src/app/admin/page.tsx
//
// ENDPOINTS:
// - PUT    /api/admin/nodos/[id] → actualiza client_id, node_id, tag_name,
//          tag_group e is_alarm del nodo
//   Body: { client_id: number, node_id: string, tag_name: string,
//           tag_group: string, is_alarm: boolean }
//   Respuesta: el nodo actualizado (o 404 si no existe)
//
// - DELETE /api/admin/nodos/[id] → elimina el nodo
//   NOTA: No elimina logs asociados. Los logs en la tabla logs quedarán
//   huérfanos si el nodo se elimina y la DB no tiene ON DELETE CASCADE.
//
// PARA MODIFICAR:
// - Agregar campos editables → editar UPDATE SET
// - Agregar cascade de logs → añadir DELETE FROM logs WHERE node_id_fk=$1
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * PUT /api/admin/nodos/[id] — Actualiza todos los campos de un nodo OPC-UA existente.
 * Retorna 404 si el nodo no existe. is_alarm default false si no se envía.
 *
 * @param req - Request con body JSON { client_id, node_id, tag_name, tag_group, is_alarm }
 * @param context - Contiene params.id con el ID del nodo a actualizar
 * @returns El nodo actualizado o error 404
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (USE_MOCK) return NextResponse.json({ message: 'Mock: nodo actualizado' });
    try {
        const { id } = await params;
        const { client_id, node_id, tag_name, tag_group, is_alarm } = await req.json();
        if (!client_id || !node_id || !tag_name || !tag_group) {
            return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
        }
        const { rows } = await query(
            'UPDATE node_ids SET client_id=$1, node_id=$2, tag_name=$3, tag_group=$4, is_alarm=$5 WHERE id=$6 RETURNING *',
            [client_id, node_id, tag_name, tag_group, is_alarm ?? false, id], 10000, 'admin-nodo-update'
        );
        if (!rows.length) return NextResponse.json({ error: 'Nodo no encontrado' }, { status: 404 });
        return NextResponse.json(rows[0]);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/nodos/[id] — Elimina un nodo OPC-UA por su ID.
 * NOTA: No elimina logs asociados en la tabla logs que referencien este nodo.
 * Esos logs quedarán huérfanos si la DB no tiene ON DELETE CASCADE.
 *
 * @param _ - Request (no utilizado)
 * @param context - Contiene params.id con el ID del nodo a eliminar
 * @returns Mensaje de confirmación
 */
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    if (USE_MOCK) return NextResponse.json({ message: 'Mock: nodo eliminado' });
    try {
        const { id } = await params;
        await query('DELETE FROM node_ids WHERE id=$1', [id], 10000, 'admin-nodo-delete');
        return NextResponse.json({ message: 'Nodo eliminado' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
