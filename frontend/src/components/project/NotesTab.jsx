import { useState, useEffect } from 'react';
import { noteService } from '../../services/noteService';
import Card from '../common/Card';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';
import { formatRelativeTime } from '../../utils/helpers';

const NotesTab = ({ projectId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [content, setContent] = useState('');

  useEffect(() => {
    fetchNotes();
  }, [projectId]);

  const fetchNotes = async () => {
    try {
      const response = await noteService.getNotes(projectId);
      setNotes(response.data || []);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNote = async (e) => {
    e.preventDefault();
    try {
      await noteService.createNote(projectId, { content });
      setShowCreateModal(false);
      setContent('');
      fetchNotes();
    } catch (error) {
      console.error('Failed to create note:', error);
      alert(error.response?.data?.message || 'Failed to create note');
    }
  };

  const handleUpdateNote = async (e) => {
    e.preventDefault();
    try {
      await noteService.updateNote(projectId, selectedNote._id, { content });
      setShowEditModal(false);
      setSelectedNote(null);
      setContent('');
      fetchNotes();
    } catch (error) {
      console.error('Failed to update note:', error);
      alert(error.response?.data?.message || 'Failed to update note');
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!window.confirm('Are you sure you want to delete this note?')) return;

    try {
      await noteService.deleteNote(projectId, noteId);
      fetchNotes();
    } catch (error) {
      console.error('Failed to delete note:', error);
      alert(error.response?.data?.message || 'Failed to delete note');
    }
  };

  const openEditModal = (note) => {
    setSelectedNote(note);
    setContent(note.content);
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-slate-100">Project Notes</h2>
        <Button onClick={() => setShowCreateModal(true)} size="sm">
          <Plus size={16} />
          New Note
        </Button>
      </div>

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card>
          <div className="text-center py-8">
            <FileText className="mx-auto text-slate-400 mb-2" size={48} />
            <p className="text-slate-500">No notes yet. Create your first note!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <Card key={note._id} className="hover:shadow-md transition-shadow bg-slate-800/50 border border-slate-700">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-slate-100 whitespace-pre-wrap">{note.content}</p>
                  <p className="text-xs text-slate-500 mt-2">
                    {formatRelativeTime(note.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEditModal(note)}
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleDeleteNote(note._id)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Note Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Note"
      >
        <form onSubmit={handleCreateNote} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-1">
              Note Content
            </label>
            <textarea
              className="input min-h-[200px] bg-slate-900 text-slate-200 placeholder-slate-500 border border-slate-700"
              placeholder="Enter your note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Create Note</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Note Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Note"
      >
        <form onSubmit={handleUpdateNote} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-100 mb-1">
              Note Content
            </label>
            <textarea
              className="input min-h-[200px] bg-slate-900 text-slate-200 placeholder-slate-500 border border-slate-700"
              placeholder="Enter your note..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button type="submit">Update Note</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default NotesTab;
