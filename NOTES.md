# NOTES — Duplicidad de despliegues en Vercel

## Hallazgo

El mismo código de `apps/desktop` está desplegado **dos veces** en Vercel,
dentro del mismo equipo (`team_KVCuEEmkKW0GoZhnQf7EtvHU`):

| Ubicación del link `.vercel` | projectName | projectId |
|------------------------------|-------------|-----------|
| Raíz del repo (`/.vercel`)   | `nexus-it`  | `prj_UZ57XWpzApaiR81mHfuflf9dEx3H` |
| `apps/desktop/.vercel`       | `desktop`   | `prj_QqbH980cXjQja1QYbwzqee1lRW7S` |

Ambos apuntan al mismo build de la app desktop (Vite). Esto significa:

- Dos URLs públicas sirviendo lo mismo.
- Doble superficie de exposición (cualquier fuga afecta a ambas).
- Confusión sobre cuál es la "oficial" y riesgo de que una quede sin actualizar.

## Acción requerida (decisión del usuario, NO se resuelve aquí)

Decidir cuál proyecto Vercel mantener y **eliminar el otro** para evitar
despliegues divergentes:

1. Identificar cuál URL usan realmente los usuarios.
2. Conservar ese proyecto; en el otro, quitar el dominio y archivar/eliminar.
3. Borrar la carpeta `.vercel` sobrante del repo para no re-vincular por error.

> No se tomó acción automática porque implica borrar un despliegue en
> producción; es una decisión operativa del dueño del proyecto.
