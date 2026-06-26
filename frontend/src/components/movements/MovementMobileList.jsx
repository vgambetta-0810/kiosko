import { memo } from 'react';
import MovementMobileCard from './MovementMobileCard';

function MovementMobileList({ movements, loading }) {
  if (loading) {
    return (
      <div className="mov-mobile-list">
        <p className="mov-mobile-list__empty">Cargando movimientos...</p>
      </div>
    );
  }

  if (!movements.length) {
    return (
      <div className="mov-mobile-list">
        <p className="mov-mobile-list__empty">No hay movimientos que coincidan con los filtros.</p>
      </div>
    );
  }

  return (
    <div className="mov-mobile-list">
      {movements.map((movement) => (
        <MovementMobileCard
          key={movement.id || movement._id}
          movement={movement}
        />
      ))}
    </div>
  );
}

export default memo(MovementMobileList);
