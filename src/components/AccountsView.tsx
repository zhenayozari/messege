import React from "react";
import { ChannelConnectorStatus } from "../types";
import { IntegrationsSettings } from "./IntegrationsSettings";

export interface AccountsViewProps {
  connectors: ChannelConnectorStatus[];
  onSyncTelegram?: () => void;
  onSyncVk?: () => void;
  activeProjectId?: string;
}

export const AccountsView: React.FC<AccountsViewProps> = (props) => {
  return (
    <div className="p-6 h-full overflow-y-auto">
      <IntegrationsSettings {...props} />
    </div>
  );
};

export { IntegrationsSettings };
