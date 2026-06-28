import { useState, useCallback } from 'react';
import type { CharacterConsistencyIntent } from '@/stores/imageIntentStore';
import type { Prompt } from '@/lib/prompts';
import Header from '@/components/layout/Header';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import ImagePage from '@/pages/ImagePage';
import CreateAdsPage from '@/pages/CreateAdsPage';
import ClonePage from '@/pages/ClonePage';
import ProductsPage from '@/pages/ProductsPage';
import CharactersPage from '@/pages/CharactersPage';
import FacebookAdsPage from '@/pages/FacebookAdsPage';
import GoogleAdsPage from '@/pages/GoogleAdsPage';
import TiktokShopPage from '@/pages/TiktokShopPage';
import ShopeeAdsPage from '@/pages/ShopeeAdsPage';
import StorePage from '@/pages/StorePage';
import ApisPage from '@/pages/ApisPage';
import PromptsPage from '@/pages/PromptsPage';

export type PageType =
  | 'image'
  | 'create-ads'
  | 'clone'
  | 'products'
  | 'characters'
  | 'facebook-ads'
  | 'google-ads'
  | 'tiktok-shop'
  | 'shopee-ads'
  | 'store'
  | 'apis'
  | 'prompts';

function AppContent() {
  const [currentPage, setCurrentPage] = useState<PageType>('image');
  const [prefillPrompt, setPrefillPrompt] = useState<string | null>(null);
  const [prefillPromptMeta, setPrefillPromptMeta] = useState<{
    requiresProduct?: boolean | undefined;
    recommendedEntityType?: 'product' | 'character' | undefined;
  } | null>(null);
  const [imageIntent, setImageIntent] = useState<CharacterConsistencyIntent | null>(null);

  const handleUsePrompt = useCallback((prompt: Prompt) => {
    setPrefillPrompt(prompt.prompt);
    setPrefillPromptMeta({
      requiresProduct: prompt.requiresProduct,
      recommendedEntityType: prompt.recommendedEntityType,
    });
  }, []);

  const handlePromptConsumed = useCallback(() => {
    setPrefillPrompt(null);
    setPrefillPromptMeta(null);
  }, []);

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[radial-gradient(circle_at_20%_0%,rgba(47,124,255,0.14),transparent_32rem),radial-gradient(circle_at_84%_12%,rgba(124,60,255,0.12),transparent_30rem),var(--background-color--background-primary)]">
      <Header currentPage={currentPage} onNavigate={setCurrentPage} />
      {currentPage === 'image' && (
        <ImagePage
          prefillPrompt={prefillPrompt}
          prefillPromptMeta={prefillPromptMeta}
          onPromptConsumed={handlePromptConsumed}
          imageIntent={imageIntent}
          onImageIntentConsumed={() => {
            setImageIntent(null);
          }}
        />
      )}
      {currentPage === 'create-ads' && <CreateAdsPage />}
      {currentPage === 'clone' && <ClonePage />}
      {currentPage === 'products' && <ProductsPage onNavigate={setCurrentPage} />}
      {currentPage === 'characters' && (
        <CharactersPage
          onNavigate={setCurrentPage}
          onCharacterConsistencyIntent={({ characterEntity, prompt, templateImageUrl }) => {
            setImageIntent({
              type: 'character-consistency-sheet',
              characterEntity,
              prompt,
              templateImageUrl,
              ts: Date.now(),
            });
          }}
        />
      )}
      {currentPage === 'facebook-ads' && <FacebookAdsPage onNavigate={setCurrentPage} />}
      {currentPage === 'google-ads' && <GoogleAdsPage onNavigate={setCurrentPage} />}
      {currentPage === 'tiktok-shop' && <TiktokShopPage onNavigate={setCurrentPage} />}
      {currentPage === 'shopee-ads' && <ShopeeAdsPage onNavigate={setCurrentPage} />}
      {currentPage === 'store' && <StorePage onNavigate={setCurrentPage} />}
      {currentPage === 'apis' && <ApisPage />}
      {currentPage === 'prompts' && (
        <PromptsPage onNavigate={setCurrentPage} onUsePrompt={handleUsePrompt} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
