import HomeFooter from "../feature-plugins/home/footer"
import PromptBtw from "../feature-plugins/prompt/btw"
import PromptFooter from "../feature-plugins/prompt/footer"
import SidebarContext from "../feature-plugins/sidebar/context"
import SidebarFooter from "../feature-plugins/sidebar/footer"
import SidebarMcp from "../feature-plugins/sidebar/mcp"
import Notifications from "../feature-plugins/system/notifications"
import Plugins from "../feature-plugins/system/plugins"
import Storybook from "../feature-plugins/system/storybook"

export const builtins = [
  HomeFooter,
  PromptFooter,
  PromptBtw,
  SidebarContext,
  SidebarMcp,
  SidebarFooter,
  Notifications,
  Plugins,
  // The storybook is a development tool; keep its route and palette commands out of
  // normal launches and register it only for HUNTAGENT_STORY runs.
  ...(process.env.HUNTAGENT_STORY ? [Storybook] : []),
]
