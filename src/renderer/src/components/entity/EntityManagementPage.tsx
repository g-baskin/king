import { useState } from 'react';
import { toast } from 'sonner';
import editorialShotTemplate from '@/assets/prompts/editorial-shot-template.png';

const CHARACTER_CONSISTENCY_SHEET_PROMPT = `Use the provided editorial template image as a HARD LAYOUT BLUEPRINT. Recreate that exact sheet structure: same panel count, same panel positions, same spacing, same relative framing style, and one final composite image only. Fill the template with exactly 5 required unique views of the same person from the character reference: (1) Front full-body, (2) Back full-body, (3) Left profile full-body, (4) Right profile full-body, (5) ECU close-up portrait face panel. HARD RULES: each required view appears exactly once; no duplicate side angles; do not replace ECU with another body shot; no missing slots; no extra slots; no collage outside the template. Keep character identity locked across all panels: same face geometry, skin tone, age, body proportions, and hairline. Keep outfit design and colors consistent across all full-body views with no wardrobe drift. Use neutral standing pose for full-body panels, direct camera alignment per required angle, expression neutral/composed. Pure white seamless studio background, high-key lighting, minimal floor shadow, commercial editorial clarity. No text labels, no logos, no added props. Before final output, verify all 5 slots are unique and match required angles; if not, correct and regenerate internally before returning the final image.`;
import UploadModal from './UploadModal';
import UploadReviewModal from './UploadReviewModal';
import EntityCard from './EntityCard';
import DeleteConfirmationModal from '@/components/ui/DeleteConfirmationModal';
import { useEntityManagement } from '@/hooks/useEntityManagement';
import type { UploadedImage, EntityType } from '@/hooks/useEntityManagement';
import type { EntityData } from '@/types/electron';
import type { PageType } from '@/App';
import { SparkleIcon } from '@/components/icons';

interface EntityManagementPageProps {
  entityType: EntityType;
  title: string;
  subtitle: string;
  createLabel: string;
  deleteTitle: string;
  deleteMessage: string;
  onNavigate: (page: PageType) => void;
  onCharacterConsistencyIntent?: (payload: {
    characterEntity: string;
    prompt: string;
    templateImageUrl: string;
  }) => void;
}

export default function EntityManagementPage({
  entityType,
  title,
  subtitle,
  createLabel,
  deleteTitle,
  deleteMessage,
  onNavigate,
  onCharacterConsistencyIntent,
}: EntityManagementPageProps) {
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const {
    entities,
    isLoading,
    isCreating,
    hasFetched,
    editingEntity,
    deleteEntityId,
    handleCreate,
    handleSaveEdit,
    handleDelete,
    confirmDelete,
    cancelDelete,
    setEditingEntity,
  } = useEntityManagement({ entityType });

  const handleFilesSelected = (files: File[]) => {
    setUploadedFiles(files);
    setIsUploadModalOpen(false);
    setIsReviewModalOpen(true);
  };

  const handleSave = async (
    name: string,
    images: UploadedImage[],
    productType?: string,
    primaryReferenceImageUrl?: string,
  ) => {
    try {
      await handleCreate(name, images, productType, primaryReferenceImageUrl);
      setIsReviewModalOpen(false);
      setUploadedFiles([]);
    } catch {
      // Error already handled in hook
    }
  };

  const handleReviewModalClose = () => {
    setIsReviewModalOpen(false);
    setUploadedFiles([]);
    setEditingEntity(null);
  };

  const handleEditEntity = (entity: EntityData) => {
    setEditingEntity(entity);
    setIsReviewModalOpen(true);
  };

  const handleSaveEditWrapper = async (
    id: string,
    name: string,
    images: UploadedImage[],
    productType?: string,
    primaryReferenceImageUrl?: string,
  ) => {
    try {
      await handleSaveEdit(id, name, images, productType, primaryReferenceImageUrl);
      setIsReviewModalOpen(false);
    } catch {
      // Error already handled in hook
    }
  };

  const handleGenerateWithEntity = (entityId: string) => {
    if (entityType === 'characters') {
      try {
        onCharacterConsistencyIntent?.({
          characterEntity: `character:${entityId}`,
          prompt: CHARACTER_CONSISTENCY_SHEET_PROMPT,
          templateImageUrl: editorialShotTemplate,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        toast.error(`Couldn't start character consistency flow: ${message}`);
      }
    }
    onNavigate('image');
  };

  return (
    <>
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onFilesSelected={handleFilesSelected}
        entityType={entityType}
      />
      <UploadReviewModal
        isOpen={isReviewModalOpen}
        onClose={handleReviewModalClose}
        initialFiles={uploadedFiles}
        entityType={entityType}
        onGenerate={handleSave}
        editEntity={editingEntity}
        onSaveEdit={handleSaveEditWrapper}
        isLoading={isCreating}
      />
      <DeleteConfirmationModal
        isOpen={!!deleteEntityId}
        title={deleteTitle}
        message={deleteMessage}
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6">
        {/* Title Section */}
        <div className="text-center">
          <h1
            className="text-3xl font-bold tracking-tight text-[var(--base-color-brand--bean)] sm:text-4xl"
            style={{ fontFamily: 'var(--text-color--font-family--heading)' }}
          >
            {title}
          </h1>
          <p className="mt-2 text-sm text-[var(--base-color-brand--umber)]">{subtitle}</p>
        </div>

        {/* CTA Button */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          disabled={isCreating}
          className="btn-cinamon mb-4"
        >
          <SparkleIcon className="size-5" />
          {isCreating ? 'Creating...' : createLabel}
        </button>

        {/* Content Grid */}
        <div className="relative grid w-full [&>*]:col-start-1 [&>*]:row-start-1">
          {/* Saved Entities */}
          <div
            className={`flex w-full flex-wrap justify-center gap-4 transition-opacity duration-200 ${
              entities.length > 0 ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
          >
            {entities.map((entity) => (
              <EntityCard
                key={entity.id}
                entity={entity}
                onGenerate={handleGenerateWithEntity}
                onEdit={handleEditEntity}
                onDelete={handleDelete}
              />
            ))}
          </div>

          {/* Empty State */}
          <div
            className={`flex w-full justify-center transition-opacity duration-200 ${
              hasFetched && !isLoading && entities.length === 0
                ? 'opacity-100'
                : 'pointer-events-none opacity-0'
            }`}
          >
            <p className="text-sm text-[var(--base-color-brand--umber)]">
              No {entityType} yet. Create one to get started.
            </p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center gap-3">
            <div className="size-6 animate-spin rounded-full border-2 border-[var(--base-color-brand--umber)]/30 border-t-[var(--base-color-brand--bean)]" />
            <span className="text-sm text-[var(--base-color-brand--umber)]">Loading...</span>
          </div>
        )}
      </main>
    </>
  );
}
