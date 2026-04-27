import { useEffect, useMemo, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const STUDENTS_URL = `${API_BASE_URL}/students/`

const emptyForm = {
  name: '',
  email: '',
  course: '',
  gpa: '',
}

function App() {
  const [students, setStudents] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const title = useMemo(
    () => (editingId ? 'Update Student' : 'Add New Student'),
    [editingId],
  )

  async function loadStudents() {
    setLoading(true)
    setMessage('')
    try {
      const response = await fetch(STUDENTS_URL)
      if (!response.ok) {
        throw new Error('Failed to load students')
      }
      const data = await response.json()
      setStudents(data.students ?? [])
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    async function loadInitialStudents() {
      setLoading(true)
      setMessage('')
      try {
        const response = await fetch(STUDENTS_URL)
        if (!response.ok) {
          throw new Error('Failed to load students')
        }
        const data = await response.json()
        setStudents(data.students ?? [])
      } catch (error) {
        setMessage(error.message)
      } finally {
        setLoading(false)
      }
    }

    loadInitialStudents()
  }, [])

  function updateForm(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function startEdit(student) {
    setEditingId(student.user_id)
    setForm({
      name: student.name,
      email: student.email,
      course: student.course,
      gpa: String(student.gpa),
    })
    setMessage('')
  }

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSaving(true)
    setMessage('')

    const payload = {
      ...form,
      gpa: Number(form.gpa),
    }

    try {
      const response = await fetch(editingId ? `${STUDENTS_URL}${editingId}` : STUDENTS_URL, {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData?.detail ?? 'Failed to save student')
      }

      resetForm()
      await loadStudents()
      setMessage(editingId ? 'Student updated.' : 'Student created.')
    } catch (error) {
      setMessage(error.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(userId) {
    setMessage('')
    try {
      const response = await fetch(`${STUDENTS_URL}${userId}`, { method: 'DELETE' })
      if (!response.ok) {
        throw new Error('Failed to delete student')
      }
      await loadStudents()
      setMessage('Student deleted.')
      if (editingId === userId) {
        resetForm()
      }
    } catch (error) {
      setMessage(error.message)
    }
  }

  return (
    <div className="page">
      <header className="hero">
        <h1>Student Course Dashboard</h1>
        <p>Manage student records from your FastAPI + MongoDB Atlas backend.</p>
      </header>

      <main className="layout">
        <section className="card">
          <h2>{title}</h2>
          <form onSubmit={handleSubmit} className="form">
            <label>
              Name
              <input
                required
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => updateForm('email', event.target.value)}
              />
            </label>
            <label>
              Course
              <input
                required
                value={form.course}
                onChange={(event) => updateForm('course', event.target.value)}
              />
            </label>
            <label>
              GPA
              <input
                type="number"
                min="0"
                max="4"
                step="0.1"
                required
                value={form.gpa}
                onChange={(event) => updateForm('gpa', event.target.value)}
              />
            </label>

            <div className="actions">
              <button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingId ? 'Update Student' : 'Create Student'}
              </button>
              {editingId ? (
                <button type="button" className="ghost" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="card">
          <div className="listHeader">
            <h2>Students</h2>
            <button onClick={loadStudents} className="ghost" disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {message ? <p className="message">{message}</p> : null}

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Course</th>
                  <th>GPA</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.length ? (
                  students.map((student) => (
                    <tr key={student.user_id}>
                      <td>{student.name}</td>
                      <td>{student.email}</td>
                      <td>{student.course}</td>
                      <td>{student.gpa}</td>
                      <td>
                        <div className="rowActions">
                          <button className="small" onClick={() => startEdit(student)}>
                            Edit
                          </button>
                          <button className="small danger" onClick={() => handleDelete(student.user_id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="empty">
                      {loading ? 'Loading students...' : 'No students found yet.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
