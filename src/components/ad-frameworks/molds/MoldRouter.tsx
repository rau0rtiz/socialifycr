import type { AdFrameworkWithDimensions } from '@/hooks/use-ad-frameworks';
import type { AdVariant } from '@/hooks/use-ad-variants';
import { LaunchView } from './LaunchView';
import { PoolView } from './PoolView';
import { AwarenessView } from './AwarenessView';

interface Props {
  framework: AdFrameworkWithDimensions;
  campaignId: string;
  variants: AdVariant[];
  onOpenVariant: (id: string) => void;
}

/**
 * Routes to the appropriate mold view based on framework.template_kind.
 * Returns null for legacy_matrix — caller renders the legacy MatrixView.
 */
export const MoldRouter = (props: Props) => {
  switch (props.framework.template_kind) {
    case 'launch':
      return <LaunchView {...props} />;
    case 'pool':
      return <PoolView {...props} />;
    case 'awareness':
      return <AwarenessView {...props} />;
    case 'legacy_matrix':
    default:
      return null;
  }
};
