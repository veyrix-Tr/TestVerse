import { useCallback, useEffect, useState } from 'react'
import { Chip, OptionPicker } from './Pickers.jsx'
import { studentOption } from './pickerHooks.js'
import { audienceText, listBatches, listGroups, listStudents, plural } from './studentsApi.js'

/* "Who can take this test": everyone, or chosen batches, groups and students. */
export default function AudienceEditor({ value, onChange, error }) {
  const [batches, setBatches] = useState(null)
  const [groups, setGroups] = useState(null)
  const [loadErr, setLoadErr] = useState(null)
  const custom = value.mode === 'custom'
  const nobody = custom && !value.batches.length && !value.groups.length && !value.students.length

  useEffect(() => {
    if (!custom || batches) return
    let live = true
    Promise.all([listBatches(), listGroups()])
      .then(([b, g]) => {
        if (!live) return
        setBatches(b)
        setGroups(g)
      })
      .catch((e) => live && setLoadErr(e.message))
    return () => {
      live = false
    }
  }, [custom, batches])

  const set = (k, list) => onChange({ ...value, [k]: list })
  const has = (k, id) => value[k].some((x) => x.id === id)
  const studentKey = value.students.map((s) => s.id).join(',')

  const searchStudents = useCallback(
    (q) => {
      const taken = new Set(studentKey ? studentKey.split(',') : [])
      return listStudents({ q }, 0, 20).then((r) => r.students.map((s) => studentOption(s, taken)))
    },
    [studentKey],
  )

  const batchOptions = (batches || []).map((b) => ({
    id: b.id,
    label: b.name,
    sub: plural(b.students, 'active student') + (b.isActive ? '' : ' · not on sale'),
    disabled: has('batches', b.id),
    note: has('batches', b.id) ? 'Chosen' : undefined,
  }))
  const groupOptions = (groups || []).map((g) => ({
    id: g.id,
    label: g.name,
    sub: plural(g.members, 'student'),
    disabled: has('groups', g.id),
    note: has('groups', g.id) ? 'Chosen' : undefined,
  }))

  return (
    <div className="card au-card">
      <div className="au-top">
        <div className="seg" role="group" aria-label="Who can take this test">
          <button type="button" aria-pressed={!custom ? 'true' : 'false'} onClick={() => onChange({ ...value, mode: 'all' })}>
            All paid students
          </button>
          <button type="button" aria-pressed={custom ? 'true' : 'false'} onClick={() => onChange({ ...value, mode: 'custom' })}>
            Chosen people
          </button>
        </div>
        <p className="au-summary">
          {custom ? (
            nobody ? (
              <span className="au-none">No student can see this test yet.</span>
            ) : (
              <>
                Given to <b>{audienceText(value)}</b>.
              </>
            )
          ) : (
            'Every student with an active batch for this exam can see it once it is published.'
          )}
        </p>
      </div>

      {custom && (
        <>
          {loadErr && (
            <div className="alert a-err" role="alert">
              <span>Couldn&apos;t load batches and groups. {loadErr}</span>
            </div>
          )}
          <div className="au-rows">
            <AuRow
              title="Batches"
              help="Students whose batch is active."
              items={value.batches}
              onRemove={(x) => set('batches', value.batches.filter((y) => y.id !== x.id))}
              picker={
                <OptionPicker
                  label="Add batch"
                  placeholder="Search batches"
                  options={batchOptions}
                  disabled={!batches}
                  empty="No batch matches."
                  onPick={(o) => set('batches', [...value.batches, { id: o.id, name: o.label }])}
                />
              }
            />
            <AuRow
              title="Groups"
              help="Everyone in the group, including students added later."
              items={value.groups}
              onRemove={(x) => set('groups', value.groups.filter((y) => y.id !== x.id))}
              picker={
                <OptionPicker
                  label="Add group"
                  placeholder="Search groups"
                  options={groupOptions}
                  disabled={!groups}
                  empty={groups && groups.length ? 'No group matches.' : 'No groups yet. Create one under Students & groups.'}
                  onPick={(o) => set('groups', [...value.groups, { id: o.id, name: o.label }])}
                />
              }
            />
            <AuRow
              title="Students"
              help="Individual students, by name, email, mobile or city."
              items={value.students}
              sub={(s) => s.email}
              onRemove={(x) => set('students', value.students.filter((y) => y.id !== x.id))}
              picker={
                <OptionPicker
                  label="Add student"
                  placeholder="Search name, email, mobile or city"
                  search={searchStudents}
                  empty="No student matches."
                  onPick={(o) => set('students', [...value.students, { id: o.id, name: o.student.name, email: o.student.email }])}
                />
              }
            />
          </div>
          {nobody && (
            <div className="alert a-warn">
              <span>Choose at least one batch, group or student, or switch to All paid students. Until then nobody can see this test.</span>
            </div>
          )}
          <p className="hint">Students who have already started the test keep access to it and their result, whatever you choose here.</p>
        </>
      )}
      {error && (
        <p className="ts-field-err" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function AuRow({ title, help, items, sub, onRemove, picker }) {
  return (
    <div className="au-row">
      <div className="au-row-head">
        <div>
          <b>{title}</b>
          <span className="hint">{help}</span>
        </div>
        {picker}
      </div>
      {items.length ? (
        <div className="sg-chips">
          {items.map((x) => (
            <Chip key={x.id} sub={sub ? sub(x) : null} onRemove={() => onRemove(x)} removeLabel={'Remove ' + x.name}>
              {x.name}
            </Chip>
          ))}
        </div>
      ) : (
        <span className="au-empty">None chosen</span>
      )}
    </div>
  )
}
