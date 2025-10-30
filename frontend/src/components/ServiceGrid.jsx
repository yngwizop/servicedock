import React, { useState, useRef } from 'react';
import ServiceCard from './ServiceCard';
import EditModal from './EditModal';

function ServiceGrid({ 
  services, 
  setServices, 
  isLoggedIn, 
  colsClass, 
  onUpdate, 
  onDelete,
  textColor,
  onReorder
}) {
	const [editingService, setEditingService] = useState(null);
	const [draggingId, setDraggingId] = useState(null);
	// Jetzt speichern wir side und last mouse pos
	const [dragOver, setDragOver] = useState({ id: null, side: null }); // side: 'left'|'right'|'top'|'bottom'
	const [dragLastX, setDragLastX] = useState(null);
	const [dragLastY, setDragLastY] = useState(null);
	const gridRef = useRef(null);

	const handleSave = async (updatedService) => {
		// Erst den State aktualisieren
		setServices(
			services.map((s) => (s.id === updatedService.id ? updatedService : s))
		);
		// Dann ans Backend senden (mit den aktualisierten Daten)
		await onUpdate(updatedService.id, updatedService);
	};

	// NEW: helper to compute side (left/right)
	const computeSide = (e, el) => {
		const rect = el.getBoundingClientRect();
		const x = e.clientX;
		// einfache Links/Rechts-Entscheidung (mittig)
		return x < rect.left + rect.width / 2 ? 'left' : 'right';
	};
	
	// Drag & Drop Handlers
	const onDragStart = (e, id) => {
		e.dataTransfer.setData("text/plain", String(id));
		e.dataTransfer.effectAllowed = 'move';
		setDraggingId(id);
		setDragLastX(e.clientX);
		setDragLastY(e.clientY);
		if (e.dataTransfer.setDragImage) {
			const crt = document.createElement('canvas');
			crt.width = 1; crt.height = 1;
			e.dataTransfer.setDragImage(crt, 0, 0);
		}
	};

	const onDragEnd = (e) => {
		setDraggingId(null);
		setDragOver({ id: null, side: null });
	};

	const onDragOverItem = (e, targetId) => {
		e.preventDefault();
		const el = e.currentTarget;
		const side = computeSide(e, el);
		if (dragOver.id !== targetId || dragOver.side !== side) {
			setDragOver({ id: targetId, side });
		}
	};

	const onDropOnItem = (e, targetId) => {
		e.preventDefault();
		const draggedId = Number(e.dataTransfer.getData("text/plain"));
		if (!draggedId || draggedId === targetId) {
			setDragOver({ id: null, side: null });
			setDraggingId(null);
			return;
		}

		const srcIndex = services.findIndex(s => s.id === draggedId);
		if (srcIndex === -1) return;

		// Find target index BEFORE removing the dragged element
		const targetIndex = services.findIndex(s => s.id === targetId);
		if (targetIndex === -1) return;

		// Determine insertion side at drop time
		const el = e.currentTarget;
		const side = computeSide(e, el);
		const before = (side === 'left');
		
		// Calculate desired insertion index in the original array
		let desiredIndex = before ? targetIndex : targetIndex + 1;

		// Now remove the dragged element
		const newServices = [...services];
		const [moved] = newServices.splice(srcIndex, 1);

		// Adjust insertion index if we removed an element before the target
		let finalIndex = desiredIndex;
		if (srcIndex < desiredIndex) {
			finalIndex = desiredIndex - 1;
		}
		
		finalIndex = Math.max(0, Math.min(newServices.length, finalIndex));
		newServices.splice(finalIndex, 0, moved);

		setServices(newServices);
		setDragOver({ id: null, side: null });
		setDraggingId(null);
		if (onReorder) onReorder(newServices.map(s => s.id));
	};

	// NEU: Fängt Drops auf dem Grid (z.B. Lücken oder unterstes Ende)
	const onDropGrid = (e) => {
		e.preventDefault();
		const draggedId = Number(e.dataTransfer.getData("text/plain"));
		if (!draggedId) return;

		const srcIndex = services.findIndex(s => s.id === draggedId);
		if (srcIndex === -1) return;

		// Build visual list from DOM (exclude dragged element) BEFORE mutating the services array
		let desiredIndexInServices = services.length; // default append
		if (gridRef && gridRef.current) {
			const domChildren = Array.from(gridRef.current.children);
			const visual = domChildren
				.filter(ch => ch && ch.dataset && ch.dataset.id && Number(ch.dataset.id) !== draggedId)
				.map(ch => ({ id: Number(ch.dataset.id), rect: ch.getBoundingClientRect() }));

			if (visual.length === 0) {
				desiredIndexInServices = services.length;
			} else {
				// group visual items into rows (tolerance)
				const rows = [];
				visual.forEach(item => {
					const topKey = Math.round(item.rect.top);
					let row = rows.find(r => Math.abs(Math.round(r.top) - topKey) <= 8);
					if (!row) { row = { top: item.rect.top, items: [] }; rows.push(row); }
					row.items.push(item);
				});

				rows.sort((a,b) => a.top - b.top);
				rows.forEach(r => r.items.sort((a,b) => a.rect.left - b.rect.left));

				// determine target row by Y
				const y = e.clientY;
				let targetRow = rows.find(r => r.items.some(it => y >= it.rect.top && y <= it.rect.bottom));
				if (!targetRow) {
					let best = null; let bestDist = Infinity;
					for (const r of rows) { const dist = Math.abs(y - r.top); if (dist < bestDist) { bestDist = dist; best = r; } }
					targetRow = best || rows[rows.length-1];
				}

				// find column in row by X midpoint
				const x = e.clientX;
				let insertInRow = targetRow.items.length;
				for (let i = 0; i < targetRow.items.length; i++) {
					const it = targetRow.items[i];
					const mid = it.rect.left + it.rect.width/2;
					if (x < mid) { insertInRow = i; break; }
				}

				// compute visual position in the filtered array (index where we want to insert in visual order)
				let countBefore = 0;
				for (const r of rows) {
					if (r === targetRow) break;
					countBefore += r.items.length;
				}
				const visualPos = countBefore + insertInRow; // position in visual array (0..visual.length)
				
				// Map visualPos to services array index BEFORE removing the dragged element
				// visual array excludes the dragged element, so we need to find where visualPos points in the original services array
				if (visualPos >= visual.length) {
					// Append at end
					desiredIndexInServices = services.length;
				} else {
					// Find the service at visual[visualPos] in the original services array
					const targetId = visual[visualPos].id;
					const targetIndexInServices = services.findIndex(s => s.id === targetId);
					desiredIndexInServices = targetIndexInServices;
				}
				
				// DEBUG: print visual mapping and computed positions for troubleshooting
				try {
					console.debug('[dnd-debug] drop candidate', {
						draggedId,
						srcIndex,
						mouse: { x: e.clientX, y: e.clientY },
						visual: visual.map(v => ({ id: v.id, left: Math.round(v.rect.left), top: Math.round(v.rect.top), w: Math.round(v.rect.width) })),
						rows: rows.map(r => ({ top: Math.round(r.top), len: r.items.length })),
						visualPos,
						desiredIndexInServices
					});
				} catch (err) { /* ignore debug failures */ }
			}
		} else {
			desiredIndexInServices = services.length;
		}

		// Now remove the dragged element and insert at the correct position
		const newServices = [...services];
		const [moved] = newServices.splice(srcIndex, 1);
		
		// Adjust finalIndex: if we removed an element before the target, shift index down by 1
		let finalIndex = desiredIndexInServices;
		if (srcIndex < desiredIndexInServices) {
			finalIndex = desiredIndexInServices - 1;
		}
		finalIndex = Math.max(0, Math.min(newServices.length, finalIndex));
		newServices.splice(finalIndex, 0, moved);		setServices(newServices);
		setDragOver({ id: null, side: null });
		setDraggingId(null);
		if (onReorder) onReorder(newServices.map(s => s.id));
	};

	return (
		<div className="mb-10">
			<h2 className="text-2xl font-semibold mb-4" style={{ color: textColor }}>Services</h2>
			<div
				ref={gridRef}
				onDragOver={(e) => e.preventDefault()}
				onDrop={onDropGrid}
				className={`grid grid-cols-2 md:grid-cols-3 ${colsClass} gap-5`}
			>
				{services.map((s) => (
					<div
						key={s.id}
						data-id={s.id}
						className={`relative group ${isLoggedIn ? (draggingId === s.id ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
						draggable={isLoggedIn}
						onDragStart={(e) => onDragStart(e, s.id)}
						onDragEnd={onDragEnd}
						onDragOver={(e) => onDragOverItem(e, s.id)}
						onDrop={(e) => onDropOnItem(e, s.id)}
					>
						{/* Linke Einfügelinie (vertikal) */}
						{dragOver.id === s.id && dragOver.side === 'left' && draggingId && (
							<div className="absolute left-0 top-2 bottom-2 w-1 rounded bg-blue-600 z-20 transform -translate-x-1 transition-all"></div>
						)}

						{/* Rechte Einfügelinie (vertikal) */}
						{dragOver.id === s.id && dragOver.side === 'right' && draggingId && (
							<div className="absolute right-0 top-2 bottom-2 w-1 rounded bg-blue-600 z-20 transform translate-x-1 transition-all"></div>
						)}

						<ServiceCard service={s} />

						{/* Edit-Button */}
						{isLoggedIn && (
							<button
								onClick={() => setEditingService(s)}
								className="absolute top-2 right-2 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
								title="Bearbeiten"
							>✏️</button>
						)}
					</div>
				))}
			</div>

			{/* Edit Modal */}
			{editingService && (
				<EditModal
					item={editingService}
					type="service"
					onClose={() => setEditingService(null)}
					onSave={handleSave}
					onDelete={onDelete}
				/>
			)}
		</div>
	);
}

export default ServiceGrid;