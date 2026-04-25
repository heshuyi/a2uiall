import { useEffect, useState } from 'react';
import type { ModalProps } from '@a2ui/protocol';
import type { CatalogComponentProps } from '../catalog.js';
import { useCatalog } from '../CatalogContext.js';
import { ResolvedComponent } from '../ComponentResolver.js';

/**
 * Modal —— 协议含义：entryPointChild 触发打开，contentChild 是弹窗内容。
 *
 * 实现简化：把 entryPointChild 包一层 div 监听点击；点击后展示 contentChild 的弹层。
 * （理想方案是让 entryPointChild 自己回传 open，但协议没定义这种回路，先用 wrapper。）
 */
export function Modal({ props }: CatalogComponentProps<ModalProps>) {
  const catalog = useCatalog();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-block cursor-pointer">
        <ResolvedComponent componentId={props.entryPointChild} catalog={catalog} />
      </span>
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-w-lg w-full rounded-xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ResolvedComponent componentId={props.contentChild} catalog={catalog} />
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-3 py-1.5 text-sm rounded-md border border-neutral-200 hover:bg-neutral-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
