// =============================================================================
// src/app/api/admin/nodos/route.ts — GET + POST nodos (admin)
// Consulta tabla: node_ids + clients (DB QNAP)
//
// PROPÓSITO: Endpoints de administración para listar y crear nodos OPC-UA.
//
// CONSUMIDO POR: NodosTab en src/app/admin/page.tsx
//
// ENDPOINTS:
// - GET  /api/admin/nodos?clientId= → lista nodos con JOIN a clients para obtener client_name
//   Opcionalmente filtra por clientId.
// - POST /api/admin/nodos → crea un nuevo nodo OPC-UA
//   Body: { client_id: number, node_id: string, tag_name: string,
//           tag_group: string, is_alarm: boolean }
//   Respuesta: el nodo creado con su id asignado (status 201)
//
// PARA MODIFICAR:
// - Agregar campos al nodo → editar INSERT y tipo Nodo en types/
// - Agregar validaciones → extender verificación antes del INSERT
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { MOCK_NODOS } from '@/data/mockData';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * GET /api/admin/nodos — Lista nodos OPC-UA para la pantalla de administración.
 * Incluye JOIN con clients para obtener client_name. Opcionalmente filtra por clientId.
 *
 * @param req - Request con query param opcional 'clientId'
 * @returns Array de Nodo[] con client_name incluido
 */
export async function GET(req: NextRequest) {
    const clientId = req.nextUrl.searchParams.get('clientId');
    if (USE_MOCK) {
        const nodos = clientId ? MOCK_NODOS.filter(n => n.client_id === parseInt(clientId)) : MOCK_NODOS;
        return NextResponse.json(nodos);
    }
    try {
        const { rows } = await query(`
      SELECT n.*, c.name as client_name
      FROM node_ids n JOIN clients c ON n.client_id = c.id
      ${clientId ? 'WHERE n.client_id = $1' : ''}
      ORDER BY c.name, n.tag_group
    `, clientId ? [clientId] : [], 10000, 'admin-nodos-list');
        return NextResponse.json(rows);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

/**
 * POST /api/admin/nodos — Crea un nuevo nodo OPC-UA.
 * Valida que client_id, node_id, tag_name y tag_group estén presentes.
 * is_alarm es opcional (default: false).
 *
 * @param req - Request con body JSON { client_id, node_id, tag_name, tag_group, is_alarm }
 * @returns El nodo creado con id asignado (status 201)
 */
export async function POST(req: NextRequest) {
    if (USE_MOCK) return NextResponse.json({ message: 'Mock: nodo creado' }, { status: 201 });
    try {
        const { client_id, node_id, tag_name, tag_group, is_alarm } = await req.json();
        if (!client_id || !node_id || !tag_name || !tag_group)
            return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
        const { rows } = await query(
            'INSERT INTO node_ids (client_id, node_id, tag_name, tag_group, is_alarm) VALUES ($1,$2,$3,$4,$5) RETURNING *',
            [client_id, node_id, tag_name, tag_group, is_alarm ?? false], 10000, 'admin-nodo-insert'
        );
        return NextResponse.json(rows[0], { status: 201 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
