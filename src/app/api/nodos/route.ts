// =============================================================================
// src/app/api/nodos/route.ts — GET /api/nodos?clientId=
// Consulta tabla: node_ids + clients (DB QNAP)
//
// PROPÓSITO: Endpoint público de solo lectura para listar nodos OPC-UA.
// Opcionalmente filtra por clientId. Se usa para llenar selectores de
// tag_group en la UI de filtros.
//
// CONSUMIDO POR:
// - LogFilterBar (carga tag_groups para el filtro de grupo)
//
// QUERY PARAMS:
// - clientId (opcional): filtra nodos por cliente específico
//
// RESPUESTA: Array de Nodo[] con { id, client_id, node_id, tag_name,
//            tag_group, is_alarm, client_name }
//
// PARA MODIFICAR:
// - Agregar más filtros → aceptar query params adicionales y agregar WHERE
// - Cambiar orden → editar ORDER BY
// =============================================================================
import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { MOCK_NODOS } from '@/data/mockData';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * GET /api/nodos — Lista nodos OPC-UA con JOIN a clients.
 * Acepta query param ?clientId= para filtrar por cliente específico.
 * En modo mock filtra el array MOCK_NODOS en memoria.
 *
 * @param req - Request con query param opcional 'clientId'
 * @returns Array de Nodo[] con client_name incluido
 */
export async function GET(req: NextRequest) {
    try {
        const clientId = req.nextUrl.searchParams.get('clientId');

        if (USE_MOCK) {
            const nodos = clientId
                ? MOCK_NODOS.filter(n => n.client_id === parseInt(clientId))
                : MOCK_NODOS;
            return NextResponse.json(nodos);
        }

        const { rows } = await query(`
      SELECT n.id, n.client_id, n.node_id, n.tag_name, n.tag_group, n.is_alarm, c.name as client_name
      FROM node_ids n
      JOIN clients c ON n.client_id = c.id
      ${clientId ? 'WHERE n.client_id = $1' : ''}
      ORDER BY c.name, n.tag_group, n.tag_name
    `, clientId ? [clientId] : [], 10000, 'nodos-list');

        return NextResponse.json(rows);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
