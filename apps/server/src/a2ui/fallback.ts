import { STANDARD_CATALOG_ID, type ServerToClientMessage } from '@a2ui/protocol';

export function buildAgentFallbackSurface(surfaceId: string, errText: string): ServerToClientMessage[] {
  return [
    { beginRendering: { surfaceId, root: 'errRoot', catalogId: STANDARD_CATALOG_ID } },
    {
      surfaceUpdate: {
        surfaceId,
        components: [
          { id: 'errRoot', component: { Card: { child: 'errCol' } } },
          {
            id: 'errCol',
            component: { Column: { alignment: 'stretch', children: { explicitList: ['errTitle', 'errBody'] } } },
          },
          { id: 'errTitle', component: { Text: { text: { literalString: '⚠️ Agent 输出不合法' }, usageHint: 'h4' } } },
          { id: 'errBody', component: { Text: { text: { literalString: errText }, usageHint: 'body' } } },
        ],
      },
    },
  ];
}

