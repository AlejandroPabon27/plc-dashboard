// =============================================================================
// src/app/api/clients/route.ts — GET /api/clients
// Consulta tabla: clients (DB QNAP)
//
// PROPÓSITO: Endpoint público de solo lectura para listar todos los clientes
// OPC-UA registrados. Se usa para llenar selectores y filtros en la UI.
//
// CONSUMIDO POR:
// - LogFilterBar (filtro de cliente en la tabla de logs)
// - NodosTab en admin/page.tsx (selector de cliente al crear nodo)
//
// RESPUESTA: Array de Cliente[] con { id, name, server_url, server_ip }
//
// PARA MODIFICAR:
// - Agregar campos → editar el SELECT y el tipo Cliente en types/
// - Agregar filtros → aceptar query params y agregar WHERE
// =============================================================================
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { MOCK_CLIENTS } from '@/data/mockData';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * GET /api/clients — Lista todos los clientes OPC-UA registrados.
 * En modo mock retorna MOCK_CLIENTS. En PostgreSQL consulta la tabla clients
 * ordenada por nombre.
 *
 * @returns Array de Cliente[] con { id, name, server_url, server_ip }
 */
export async function GET() {
    try {
        if (USE_MOCK) {
            return NextResponse.json(MOCK_CLIENTS);
        }
        const result = await query('SELECT id, name, server_url, server_ip FROM clients ORDER BY name', [], 10000, 'clients-list');
        return NextResponse.json(result.rows);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
