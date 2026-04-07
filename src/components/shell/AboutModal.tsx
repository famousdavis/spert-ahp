import * as Dialog from '@radix-ui/react-dialog';

interface AboutModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AboutModal({ open, onClose }: AboutModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto z-50">
          <Dialog.Title className="text-lg font-bold text-gray-900 mb-4">
            About SPERT<span className="text-gray-300 text-xs align-super">®</span> AHP
          </Dialog.Title>

          <div className="space-y-4 text-sm text-gray-600">
            <p>
              <strong>SPERT<span className="text-gray-300 text-[10px] align-super">®</span> AHP</strong> is a decision-making application based on the
              Analytic Hierarchy Process (AHP), developed by Thomas L. Saaty. AHP helps
              you make complex decisions by breaking them down into a hierarchy of
              criteria and alternatives, then comparing them pairwise using a structured
              1-9 ratio scale.
            </p>

            <div>
              <h3 className="font-medium text-gray-800 mb-1">How It Works</h3>
              <ol className="list-decimal list-inside space-y-1">
                <li>Define your decision criteria and alternatives</li>
                <li>Compare items pairwise on a 1-9 importance scale</li>
                <li>The system derives priority weights using mathematical methods</li>
                <li>Consistency checks ensure your judgments are logically sound</li>
                <li>Results show the overall ranking with sensitivity analysis</li>
              </ol>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-1">The 1-9 Scale</h3>
              <p>
                Each comparison asks: how much more important is item A compared to item B?
                A value of 1 means equally important, 3 means moderately more, 5 strongly
                more, 7 very strongly more, and 9 extremely more important. Intermediate
                values (2, 4, 6, 8) represent compromises.
              </p>
            </div>

            <div>
              <h3 className="font-medium text-gray-800 mb-1">Consistency Checking</h3>
              <p>
                AHP includes mathematical consistency checking via the Consistency Ratio (CR).
                If you say A is twice as important as B, and B is twice as important as C,
                then A should be four times as important as C. When judgments deviate from
                this transitivity, the CR flags it so you can revise.
              </p>
            </div>

            <p className="text-xs text-gray-400 pt-2 border-t border-gray-100">
              SPERT<span className="text-gray-300 text-[10px] align-super">®</span> AHP v0.1.0 — Part of the Statistical PERT Software Suite
            </p>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              ×
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
