
import React, { useState } from 'react';
import { 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Settings, Database, Terminal, BarChart, MessageSquare, Clock, Computer } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: 'connection', label: 'Connection', icon: Settings },
  { id: 'market', label: 'Market Monitor', icon: BarChart },
  { id: 'strategy', label: 'Trading Strategy', icon: Terminal },
  { id: 'sentiment', label: 'Sentiment Analysis', icon: MessageSquare },
  { id: 'logs', label: 'Strategy Logs', icon: Clock },
];

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  activeSection,
  onSectionChange 
}) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar>
          <SidebarHeader className="flex items-center justify-between p-4">
            <div className="flex items-center">
              <Computer className="h-6 w-6 text-sidebar-primary mr-2" />
              <h1 className="text-lg font-bold">Trade Automator</h1>
            </div>
          </SidebarHeader>
          
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Trading Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {sections.map((section) => (
                    <SidebarMenuItem key={section.id}>
                      <SidebarMenuButton
                        onClick={() => onSectionChange(section.id)}
                        className={cn(
                          "w-full flex items-center",
                          activeSection === section.id && "bg-sidebar-accent text-sidebar-accent-foreground"
                        )}
                      >
                        <section.icon className="mr-2 h-5 w-5" />
                        <span>{section.label}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          
          <SidebarFooter className="p-4">
            <div className="flex flex-col space-y-2">
              <Button variant="default" size="sm" className="w-full">
                Start CLI Mode
              </Button>
              <div className="text-xs text-muted-foreground text-center pt-2">
                v1.0.0 - LLM Crypto Trader
              </div>
            </div>
          </SidebarFooter>
        </Sidebar>
        
        <div className="flex-1 p-6 overflow-auto">
          <SidebarTrigger className="mb-4" />
          <main>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AppLayout;
