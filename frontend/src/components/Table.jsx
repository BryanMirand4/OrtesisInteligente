export function Table({ columns, data, emptyMessage = 'Sin registros.', rowKey }) {
  if (!data || data.length === 0) {
    return <p className="table-empty">{emptyMessage}</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={
                rowKey
                  ? rowKey(row)
                  : row.id_usuario ?? row.id_bitacora ?? row.id_paciente ?? row.id_diagnostico ?? row.id_protocolo ?? row.id ?? i
              }
            >
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
