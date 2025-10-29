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

		// robust approach: remove moved from a copy, then find current index of target in the modified array
		const newServices = [...services];
		const srcIndex = newServices.findIndex(s => s.id === draggedId);
		if (srcIndex === -1) return;
		const [moved] = newServices.splice(srcIndex, 1);

		// find target index after removal
		// compute insertion side at drop time (more robust than relying on dragOver state)
		const newTargetIndex = newServices.findIndex(s => s.id === targetId);
		if (newTargetIndex === -1) {
			// fallback: append
			newServices.push(moved);
		} else {
			// determine side using the actual event and target element
			const el = e.currentTarget;
			const side = computeSide(e, el);
			const before = (side === 'left');
			const insertIndex = before ? newTargetIndex : newTargetIndex + 1;
			const safeIndex = Math.max(0, Math.min(newServices.length, insertIndex));
			newServices.splice(safeIndex, 0, moved);
		}

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

		// Build a new array without the moved item
		const newServices = [...services];
		const [moved] = newServices.splice(srcIndex, 1);

		// If we have a grid ref, compute insertion index based on pointer position
		let insertIndex = newServices.length; // default: end
		if (gridRef && gridRef.current) {
			const children = Array.from(gridRef.current.children).filter(ch => ch && ch.dataset && ch.dataset.key !== undefined);
			// Fallback: use all children in DOM order
			const domChildren = Array.from(gridRef.current.children);
			for (let i = 0; i < domChildren.length; i++) {
				const ch = domChildren[i];
				if (!ch) continue;
				const rect = ch.getBoundingClientRect();
				const mid = rect.left + rect.width / 2;
				if (e.clientX < mid) {
					insertIndex = i;
					break;
				}
			}
		}

		const safeIndex = Math.max(0, Math.min(newServices.length, insertIndex));
		newServices.splice(safeIndex, 0, moved);

		setServices(newServices);
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